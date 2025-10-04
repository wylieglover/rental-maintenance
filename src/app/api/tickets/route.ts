// GET  → list tickets   (OWNER|MANAGER|STAFF, scoped to org)
// POST → create ticket  (OWNER|MANAGER, scoped to org)
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import logger from '@/lib/logger'
import { limit } from '@/lib/rate-limit'
import {
  TicketPriority,
  TicketStatus,
  TicketCategory,
  Prisma,
} from '@prisma/client'
import { requireSessionOrgRole } from '@/lib/auth'

// GET /api/tickets
export async function GET(req: NextRequest) {
  let orgId: string
  try {
    ({ orgId } = await requireSessionOrgRole(['OWNER', 'MANAGER', 'STAFF']))
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const Q = z.object({
    status:     z.nativeEnum(TicketStatus).nullish(),
    priority:   z.nativeEnum(TicketPriority).nullish(),
    category:   z.nativeEnum(TicketCategory).nullish(),
    propertyId: z.string().cuid().nullish(),
    page:       z.coerce.number().int().min(1).default(1),
    pageSize:   z.coerce.number().int().min(1).max(200).default(20),
  })

  const parsed = Q.safeParse({
    status: req.nextUrl.searchParams.get('status'),
    priority: req.nextUrl.searchParams.get('priority'),
    category: req.nextUrl.searchParams.get('category'),
    propertyId: req.nextUrl.searchParams.get('propertyId'),
    page: req.nextUrl.searchParams.get('page'),
    pageSize: req.nextUrl.searchParams.get('pageSize'),
  })
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { status, priority, category, propertyId, page, pageSize } = parsed.data

  const where: Prisma.TicketWhereInput = {
    organisationId: orgId,
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(category ? { category } : {}),
    ...(propertyId ? { propertyId } : {}),
  }

  const [total, items] = await prisma.$transaction([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { tenant: true, property: true },
    }),
  ])

  return NextResponse.json({ total, items, page, pageSize })
}

// POST /api/tickets (OWNER|MANAGER)
const CreateSchema = z.object({
  description: z.string().max(500).optional(),
  category:    z.nativeEnum(TicketCategory).default('OTHER'),
  priority:    z.nativeEnum(TicketPriority).default('MEDIUM'),
  imageUrls:   z.array(z.string().url()).max(5).optional(),
  tenantId:    z.string().cuid(),
  propertyId:  z.string().cuid(),
})

export async function POST(req: NextRequest) {
  let orgId: string
  try {
    ({ orgId } = await requireSessionOrgRole(['OWNER', 'MANAGER']))
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 5 ticket-creates / minute per IP
  const rl = await limit(req.headers.get('x-forwarded-for') ?? 'global-create', {
    window: 60, limit: 5,
  })
  if (!rl.success) return NextResponse.json({ error: 'Too many tickets' }, { status: 429 })

  const body = await req.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { tenantId, propertyId, ...rest } = parsed.data

  // Ensure property belongs to caller's org
  const property = await prisma.property.findFirst({
    where: { id: propertyId, organisationId: orgId },
    select: { id: true },
  })
  if (!property) {
    return NextResponse.json({ error: 'Property not found' }, { status: 404 })
  }

  // Ensure tenant belongs to same org
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, organisationId: orgId },
    select: { id: true, propertyId: true },
  })
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  // (Optional strictness): require tenant to already belong to that property
  if (tenant.propertyId !== propertyId) {
    return NextResponse.json({ error: 'Tenant does not belong to that property' }, { status: 400 })
  }

  const ticket = await prisma.ticket.create({
    data: {
      ...rest,
      tenantId,
      propertyId,
      organisationId: orgId,
    },
  })

  logger.info({ ticketId: ticket.id }, 'Ticket created via API')
  return NextResponse.json(ticket, { status: 201 })
}
