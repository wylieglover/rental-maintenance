// GET  → fetch single tenant (OWNER|MANAGER|STAFF, scoped to org)
// PATCH → update name/unit/phone (OWNER|MANAGER|STAFF, scoped to org)
// DELETE → remove tenant (OWNER|MANAGER; blocks if tickets exist)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSessionOrgRole } from '@/lib/auth'
import { z } from 'zod'
import logger from '@/lib/logger'
import { normalizeUSPhone } from '@/lib/phone'

function notFound() {
  return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
}

// --------------------- GET ---------------------
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  let orgId: string
  try {
    ({ orgId } = await requireSessionOrgRole(['OWNER', 'MANAGER', 'STAFF']))
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await ctx.params

  const tenant = await prisma.tenant.findFirst({
    where: { id, organisationId: orgId },
    include: {
      property: { select: { id: true, name: true, address: true } },
      tickets: {
        orderBy: { createdAt: 'desc' },
        include: { property: { select: { id: true, name: true } } },
      },
    },
  })

  return tenant ? NextResponse.json(tenant) : notFound()
}

// --------------------- PATCH ---------------------
const PatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  unitNumber: z.string().max(20).optional(),
  phoneNumber: z.string().min(7).max(20).optional(),
})

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  let orgId: string
  try {
    ({ orgId } = await requireSessionOrgRole(['OWNER', 'MANAGER', 'STAFF']))
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await ctx.params

  const body = await req.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const existing = await prisma.tenant.findFirst({
    where: { id, organisationId: orgId },
    select: { id: true, propertyId: true },
  })
  if (!existing) return notFound()

  let phone: string | undefined
  if (parsed.data.phoneNumber !== undefined) {
    const norm = normalizeUSPhone(parsed.data.phoneNumber)
    if (!norm) return NextResponse.json({ error: 'Invalid phoneNumber' }, { status: 400 })
    phone = norm
  }

  try {
    const updated = await prisma.tenant.update({
      where: { id },
      data: {
        name: parsed.data.name ?? undefined,
        unitNumber: parsed.data.unitNumber ?? undefined,
        phoneNumber: phone ?? undefined,
      },
      include: {
        property: { select: { id: true, name: true, address: true } },
      },
    })
    return NextResponse.json(updated)
  } catch (err: any) {
    // handle composite uniqueness: (phoneNumber, propertyId)
    if (err?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Phone already exists for this property' },
        { status: 409 }
      )
    }
    logger.error({ err }, 'Tenant update failed')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// --------------------- DELETE ---------------------
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  let orgId: string
  try {
    ({ orgId } = await requireSessionOrgRole(['OWNER', 'MANAGER']))
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await ctx.params

  const tenant = await prisma.tenant.findFirst({
    where: { id, organisationId: orgId },
    select: { id: true },
  })
  if (!tenant) return notFound()

  const ticketCount = await prisma.ticket.count({ where: { tenantId: id } })
  if (ticketCount > 0) {
    return NextResponse.json(
      { error: 'Cannot delete tenant with existing tickets' },
      { status: 409 }
    )
  }

  await prisma.tenant.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
