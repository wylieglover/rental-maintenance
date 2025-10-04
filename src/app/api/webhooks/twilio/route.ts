import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { analyzeMaintenanceIssue } from '@/lib/image-analysis'
import { TicketCategory, TicketPriority, ConversationState } from '@prisma/client'
import logger from '@/lib/logger'
import { limit } from '@/lib/rate-limit'
import { twilioService } from '@/lib/twilio'
import twilio from 'twilio'
import { normalizeUSPhone, altFormsForLookup } from '@/lib/phone'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_TIMESTAMP_SKEW = 60 * 5

async function ensureUnassignedProperty(orgId: string) {
  const name = '__UNASSIGNED_INBOX__'
  let prop = await prisma.property.findFirst({ where: { organisationId: orgId, name } })
  if (!prop) {
    prop = await prisma.property.create({
      data: {
        organisationId: orgId,
        name,
        address: 'SMS Intake',
        phoneNumber: `UNASSIGNED-${orgId.slice(0, 8)}-${Date.now()}`,
      },
    })
  }
  return prop
}

async function sendConfirmation(to: string, ticketId: string, priority: TicketPriority, fromE164: string) {
  let body = `✅ Maintenance request received! Ticket #${ticketId.slice(-6)}`
  if      (priority === 'EMERGENCY') body += '\n🚨 EMERGENCY – we’ll contact you ASAP'
  else if (priority === 'HIGH')      body += '\n⚠️ High priority – response within 4 h'
  else if (priority === 'MEDIUM')    body += '\n📋 Response within 24 h'
  else                               body += '\n📝 Response in 2–3 business days'
  await twilioService.sendSMS({ to, from: fromE164, body })
}

async function promptForAddress(to: string, fromE164: string) {
  const body =
    `Thanks! To route this correctly, reply with your **address & unit** (e.g., “123 Main St #5B”).\n` +
    `You don’t need to resend photos.`
  await twilioService.sendSMS({ to, from: fromE164, body })
}

function expectedWebhookUrl(req: NextRequest) {
  const envBase = process.env.PUBLIC_URL || process.env.NGROK_URL || ''
  if (envBase) return new URL('/api/webhooks/twilio', envBase).toString()
  const proto = req.headers.get('x-forwarded-proto') ?? 'https'
  const host  = req.headers.get('x-forwarded-host') ?? req.headers.get('host')!
  const path  = new URL(req.url).pathname
  return `${proto}://${host}${path}`
}

export async function GET() { return new NextResponse('ok', { status: 200 }) }

export async function POST(request: NextRequest) {
  const start = Date.now()
  try {
    const sig = request.headers.get('x-twilio-signature') ?? ''
    if (!sig) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const rawBody = await request.text()
    const search = new URLSearchParams(rawBody)
    const params: Record<string, string> = {}
    for (const [k, v] of search.entries()) params[k] = v

    const tsHd = request.headers.get('x-twilio-request-timestamp')
    if (tsHd) {
      const ts = Number(tsHd)
      if (isFinite(ts) && Math.abs(Math.floor(Date.now() / 1000) - ts) > MAX_TIMESTAMP_SKEW) {
        return NextResponse.json({ error: 'Stale request' }, { status: 403 })
      }
    }

    const expectedUrl = expectedWebhookUrl(request)
    const valid =
      twilio.validateRequestWithBody(process.env.TWILIO_AUTH_TOKEN!, sig, expectedUrl, rawBody) ||
      twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN!, sig, expectedUrl, params)
    if (!valid) {
      logger.warn({ expectedUrl, seenUrl: request.url }, 'Twilio signature failed')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ----- Extract & normalize phone numbers -----
    const toNumber    = params['To']
    const rawFrom     = params['From']
    const messageBody = params['Body'] ?? ''
    const NumMedia    = params['NumMedia'] ?? '0'
    const messageSid  = (params['MessageSid'] || params['SmsMessageSid']) as string | undefined

    if (!rawFrom || !toNumber) return NextResponse.json({ error: 'Missing phone numbers' }, { status: 400 })

    const from = normalizeUSPhone(rawFrom) ?? rawFrom // Twilio already E.164; normalize anyway

    if (messageSid) {
      const dupe = await prisma.ticket.findFirst({ where: { externalMessageSid: messageSid }, select: { id: true } })
      if (dupe) return NextResponse.json({ ok: true })
    }

    const rl = await limit(`twilio:${from}`)
    if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

    // ----- Resolve routing (legacy property → org, or org number) -----
    let orgId: string | null = null
    let propertyId: string | null = null

    const legacyProp = await prisma.property.findUnique({
      where: { phoneNumber: toNumber },
      select: { id: true, organisationId: true },
    })
    if (legacyProp) { propertyId = legacyProp.id; orgId = legacyProp.organisationId }

    if (!orgId) {
      const orgNum = await prisma.orgNumber.findUnique({
        where: { e164: toNumber },
        select: { organisationId: true, propertyId: true },
      })
      if (!orgNum) {
        logger.warn({ toNumber }, 'No property or org number match')
        return NextResponse.json({ error: 'Destination not configured' }, { status: 404 })
      }
      orgId = orgNum.organisationId
      if (orgNum.propertyId) propertyId = orgNum.propertyId
    }

    // ----- Find/create tenant (normalized + alternates) -----
    const lookups = altFormsForLookup(from)
    let tenant = await prisma.tenant.findFirst({
      where: {
        organisationId: orgId!,
        OR: lookups.map((p) => ({ phoneNumber: p })),
      },
      include: { property: true },
    })

    let isNewTenant = false
    if (!tenant) {
      if (!propertyId) propertyId = (await ensureUnassignedProperty(orgId!)).id
      tenant = await prisma.tenant.create({
        data: { organisationId: orgId!, phoneNumber: from, propertyId },
        include: { property: true },
      })
      isNewTenant = true
    } else if (tenant.phoneNumber !== from) {
      // Backfill/normalize legacy tenant row to E.164
      await prisma.tenant.update({ where: { id: tenant.id }, data: { phoneNumber: from } })
    }

    // Keep conversation pointer up to date
    await prisma.conversation.upsert({
      where: { organisationId_phoneNumber: { organisationId: orgId!, phoneNumber: from } },
      update: {
        propertyId: tenant.propertyId,
        tenantId: tenant.id,
        state: propertyId ? ConversationState.IDLE : ConversationState.ASK_PROPERTY,
        lastMessageAt: new Date(),
      },
      create: {
        organisationId: orgId!,
        phoneNumber: from,
        propertyId: tenant.propertyId,
        tenantId: tenant.id,
        state: propertyId ? ConversationState.IDLE : ConversationState.ASK_PROPERTY,
      },
    })

    if (isNewTenant && !propertyId) {
      promptForAddress(from, toNumber).catch((err) => logger.error({ err }, 'Prompt failed'))
    }

    // ----- Media -----
    const imageUrls: string[] = []
    const mediaCnt = parseInt(NumMedia, 10) || 0
    for (let i = 0; i < mediaCnt; i++) {
      const mUrl = params[`MediaUrl${i}`]
      const ctype = params[`MediaContentType${i}`] || 'image/jpeg'
      if (!mUrl) continue
      try { imageUrls.push(await twilioService.downloadMediaToBlob(mUrl, ctype)) }
      catch (err) { logger.error({ err, mUrl }, 'Media persistence failed') }
    }

    // ----- Triage -----
    let category: TicketCategory = TicketCategory.UNKNOWN
    let priority: TicketPriority = TicketPriority.MEDIUM
    try {
      const a = await analyzeMaintenanceIssue(messageBody, imageUrls)
      if (a?.category) category = a.category
      if (a?.priority) priority = a.priority
    } catch (err) {
      logger.error({ err }, 'Issue analysis failed')
    }

    // ----- Create ticket -----
    const ticket = await prisma.ticket.create({
      data: {
        organisationId: tenant.organisationId,
        propertyId: tenant.propertyId,
        tenantId: tenant.id,
        description: messageBody,
        category,
        priority,
        imageUrls,
        externalMessageSid: messageSid ?? null,
      },
    })

    sendConfirmation(from, ticket.id, priority, toNumber).catch((err) =>
      logger.error({ err }, 'Confirmation SMS failed')
    )

    logger.info(
      { ticketId: ticket.id, orgId, propertyId: tenant.propertyId, ms: Date.now() - start },
      'Inbound ticket created'
    )
    return NextResponse.json({ success: true, ticketId: ticket.id })
  } catch (err) {
    logger.error({ err }, 'Webhook processing failed')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
