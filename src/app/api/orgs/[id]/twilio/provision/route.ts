// POST → purchase or attach a Twilio number; can map it to a property on create
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { twilioClient } from '@/lib/twilio'
import { requireOrgRole } from '@/lib/auth'

type Body =
  | { mode?: 'purchase'; type?: 'LOCAL' | 'TOLLFREE'; areaCode?: string; propertyId?: string }
  | { mode: 'attach'; phoneNumber: string; propertyId?: string }

function getPublicBase() {
  const base =
    process.env.PUBLIC_URL ||
    process.env.NGROK_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  return base
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params

  // OWNER/MANAGER in the specified org
  await requireOrgRole(id, ['OWNER', 'MANAGER'])

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return NextResponse.json(
      { error: 'Twilio is not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.' },
      { status: 503 }
    )
  }

  const publicBase = getPublicBase()
  if (!publicBase || /localhost|127\.0\.0\.1/.test(publicBase)) {
    return NextResponse.json(
      { error: 'Set PUBLIC_URL to a public HTTPS origin (ngrok/cloudflared) so Twilio can reach your webhook.' },
      { status: 400 }
    )
  }
  const webhookUrl = new URL('/api/webhooks/twilio', publicBase).toString()

  const body = (await req.json().catch(() => ({}))) as Body

  // If a propertyId was supplied, verify it belongs to this org
  let propertyId: string | undefined = body.propertyId
  if (propertyId) {
    const propOk = await prisma.property.findFirst({
      where: { id: propertyId, organisationId: id },
      select: { id: true },
    })
    if (!propOk) return NextResponse.json({ error: 'Property not found' }, { status: 404 })
  }

  try {
    // Attach an existing number (trial-friendly)
    if (body.mode === 'attach') {
      if (!body.phoneNumber) return NextResponse.json({ error: 'phoneNumber is required' }, { status: 400 })

      const owned = await twilioClient.incomingPhoneNumbers.list({
        phoneNumber: body.phoneNumber,
        limit: 1,
      })
      if (!owned.length) {
        return NextResponse.json({ error: 'That number is not in your Twilio account' }, { status: 404 })
      }

      await twilioClient.incomingPhoneNumbers(owned[0].sid).update({ smsUrl: webhookUrl })

      const num = await prisma.orgNumber.create({
        data: {
          organisationId: id,
          e164: owned[0].phoneNumber!,
          twilioSid: owned[0].sid,
          active: true,
          propertyId, // ← map to property if provided
        },
      })
      return NextResponse.json({ success: true, number: num }, { status: 201 })
    }

    // Purchase (may not work on trial)
    const type = body.type ?? 'LOCAL'
    if (type === 'TOLLFREE') {
      const search = await twilioClient.availablePhoneNumbers('US').tollFree.list({
        smsEnabled: true,
        mmsEnabled: true,
        limit: 1,
      })
      if (!search.length) return NextResponse.json({ error: 'No toll-free numbers available' }, { status: 404 })

      const created = await twilioClient.incomingPhoneNumbers.create({
        phoneNumber: search[0].phoneNumber!,
        smsUrl: webhookUrl,
      })

      const num = await prisma.orgNumber.create({
        data: {
          organisationId: id,
          e164: created.phoneNumber!,
          twilioSid: created.sid,
          active: true,
          propertyId, // ← map to property if provided
        },
      })
      return NextResponse.json({ success: true, number: num }, { status: 201 })
    } else {
      const areaCodeNum = body.areaCode ? parseInt(body.areaCode, 10) : undefined
      const search = await twilioClient.availablePhoneNumbers('US').local.list({
        areaCode: areaCodeNum,
        smsEnabled: true,
        mmsEnabled: true,
        limit: 1,
      })
      if (!search.length) return NextResponse.json({ error: 'No local numbers available' }, { status: 404 })

      const created = await twilioClient.incomingPhoneNumbers.create({
        phoneNumber: search[0].phoneNumber!,
        smsUrl: webhookUrl,
      })

      const num = await prisma.orgNumber.create({
        data: {
          organisationId: id,
          e164: created.phoneNumber!,
          twilioSid: created.sid,
          active: true,
          propertyId, // ← map to property if provided
        },
      })
      return NextResponse.json({ success: true, number: num }, { status: 201 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Twilio provisioning failed' }, { status: 502 })
  }
}
