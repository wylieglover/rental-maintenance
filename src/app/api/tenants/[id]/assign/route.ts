// src/app/api/tenants/[id]/assign/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSessionOrgRole } from '@/lib/auth'
import { limit } from '@/lib/rate-limit'
import logger from '@/lib/logger'
import { twilioService } from '@/lib/twilio'
import { TicketStatus } from '@prisma/client'

const BodySchema = z.object({
  propertyId: z.string().cuid(),
  moveOpenTickets: z.boolean().default(true),
  notify: z.boolean().default(true),
  notifyMessage: z.string().max(1600).optional(),
})

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> } // ← await this
) {
  const { id } = await ctx.params

  // Allow OWNER too
  let orgId: string
  try {
    ({ orgId } = await requireSessionOrgRole(['OWNER', 'MANAGER', 'STAFF']))
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rl = await limit(`tenant-assign:${id}`, { window: 60, limit: 10 })
  if (!rl.success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  const body = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { propertyId, moveOpenTickets, notify, notifyMessage } = parsed.data

  const tenant = await prisma.tenant.findFirst({
    where: { id, organisationId: orgId },
    select: { id: true, phoneNumber: true, propertyId: true },
  })
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const target = await prisma.property.findFirst({
    where: { id: propertyId, organisationId: orgId },
    select: { id: true, name: true },
  })
  if (!target) return NextResponse.json({ error: 'Property not found' }, { status: 404 })

  if (tenant.propertyId === propertyId) {
    return NextResponse.json({ success: true, moved: 0, message: 'Tenant already in property' })
  }

  const moved = await prisma.$transaction(async (tx) => {
    let movedCount = 0
    if (moveOpenTickets) {
      const res = await tx.ticket.updateMany({
        where: {
          tenantId: tenant.id,
          organisationId: orgId,
          propertyId: tenant.propertyId,
          status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] },
        },
        data: { propertyId },
      })
      movedCount = res.count
    }

    await tx.tenant.update({ where: { id: tenant.id }, data: { propertyId } })

    await tx.conversation.upsert({
      where: {
        organisationId_phoneNumber: { organisationId: orgId, phoneNumber: tenant.phoneNumber },
      },
      update: { propertyId, tenantId: tenant.id, state: 'IDLE', lastMessageAt: new Date() },
      create: { organisationId: orgId, phoneNumber: tenant.phoneNumber, propertyId, tenantId: tenant.id, state: 'IDLE' },
    })

    return movedCount
  })

  if (notify) {
    const msg = notifyMessage || `Thanks! We’ve assigned your request to ${target.name}.`
    twilioService.sendSMS({ to: tenant.phoneNumber, body: msg }).catch((err) =>
      logger.error({ err }, 'Assign notify failed')
    )
  }

  logger.info({ tenantId: tenant.id, newPropertyId: propertyId, moved }, 'Tenant assigned to property')
  return NextResponse.json({ success: true, moved })
}
