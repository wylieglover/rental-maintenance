// GET     → fetch single ticket (OWNER|MANAGER|STAFF, scoped to org)
// PATCH   → partial update      (OWNER|MANAGER|STAFF, scoped to org)
// DELETE  → permanently delete  (OWNER|MANAGER, scoped to org)
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import logger from '@/lib/logger'
import { limit } from '@/lib/rate-limit'
import { requireSessionOrgRole } from '@/lib/auth'
import { TicketPriority, TicketStatus } from '@prisma/client'

function notFound() {
  return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
}

// GET /api/tickets/[id]
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> } // ← await this
) {
  let orgId: string
  try {
    ({ orgId } = await requireSessionOrgRole(['OWNER', 'MANAGER', 'STAFF']))
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await ctx.params

  const ticket = await prisma.ticket.findFirst({
    where: { id, organisationId: orgId },
    include: { tenant: true, property: true },
  })
  return ticket ? NextResponse.json(ticket) : notFound()
}

// PATCH /api/tickets/[id]  body: { status?, priority?, description? }
const PatchSchema = z
  .object({
    status:      z.nativeEnum(TicketStatus).optional(),
    priority:    z.nativeEnum(TicketPriority).optional(),
    description: z.string().max(500).optional(),
  })
  .refine((obj) => Object.keys(obj).length, { message: 'Empty body' })

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> } // ← await this
) {
  let orgId: string
  try {
    ({ orgId } = await requireSessionOrgRole(['OWNER', 'MANAGER', 'STAFF']))
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await ctx.params

  const rl = await limit(`patch:${id}`)
  if (!rl.success) return NextResponse.json({ error: 'Too many updates' }, { status: 429 })

  const body = await req.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const exists = await prisma.ticket.findFirst({
    where: { id, organisationId: orgId },
    select: { id: true },
  })
  if (!exists) return notFound()

  const updated = await prisma.ticket.update({
    where: { id },
    data: parsed.data,
  })
  logger.info({ ticketId: id }, 'Ticket updated')
  return NextResponse.json(updated)
}

// DELETE /api/tickets/[id]
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> } // ← await this
) {
  let orgId: string
  try {
    ({ orgId } = await requireSessionOrgRole(['OWNER', 'MANAGER']))
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await ctx.params

  const exists = await prisma.ticket.findFirst({
    where: { id, organisationId: orgId },
    select: { id: true },
  })
  if (!exists) return notFound()

  await prisma.ticket.delete({ where: { id } })
  logger.info({ ticketId: id }, 'Ticket deleted')

  // 204 must not include a body
  return new Response(null, { status: 204 })
}
