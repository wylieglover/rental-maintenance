// GET → list tenants (OWNER | STAFF | MANAGER, scoped to org)
// POST → create tenant (OWNER | MANAGER | STAFF, scoped to org)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSessionOrgRole } from '@/lib/auth'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { limit } from '@/lib/rate-limit'
import { normalizeUSPhone } from '@/lib/phone'

// --------------------- GET ---------------------
export async function GET(req: NextRequest) {
  let orgId: string
  try { ({ orgId } = await requireSessionOrgRole(['OWNER','STAFF','MANAGER'])) }
  catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const Q = z.object({
    q:          z.string().trim().max(120).nullish(),
    propertyId: z.string().cuid().nullish(),
    page:       z.coerce.number().int().min(1).default(1),
    pageSize:   z.coerce.number().int().min(1).max(200).default(20),
  })

  const sp = req.nextUrl.searchParams
  const parsed = Q.safeParse({
    q: sp.get('q') ?? undefined,
    propertyId: sp.get('propertyId') ?? undefined,
    page: sp.get('page'),
    pageSize: sp.get('pageSize'),
  })
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const q = parsed.data.q ?? ''
  const propertyId = parsed.data.propertyId ?? undefined
  const page = parsed.data.page
  const pageSize = parsed.data.pageSize
  const digits = q.replace(/\D/g, '')

  const ors: Prisma.TenantWhereInput[] = []
  if (q) {
    ors.push(
      { name:        { contains: q, mode: 'insensitive' } },
      { unitNumber:  { contains: q, mode: 'insensitive' } },
      { phoneNumber: { contains: q, mode: 'insensitive' } },
      {
        property: {
          is: {
            OR: [
              { name:    { contains: q, mode: 'insensitive' } },
              { address: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
      },
    )
    if (digits.length >= 4) {
      ors.push({ phoneNumber: { contains: digits, mode: 'insensitive' } })
    }
  }

  const where: Prisma.TenantWhereInput = {
    organisationId: orgId,
    ...(propertyId ? { propertyId } : {}),
    ...(ors.length ? { OR: ors } : {}),
  }

  const [total, items] = await prisma.$transaction([
    prisma.tenant.count({ where }),
    prisma.tenant.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { property: { select: { id: true, name: true } } },
    }),
  ])

  return NextResponse.json({ total, items, page, pageSize })
}

// --------------------- POST ---------------------
const CreateSchema = z.object({
  propertyId:  z.string().cuid(),
  phoneNumber: z.string().min(7).max(32),
  name:        z.string().min(1).max(100).optional(),
  unitNumber:  z.string().max(20).optional(),
})

export async function POST(req: NextRequest) {
  let orgId: string
  try { ({ orgId } = await requireSessionOrgRole(['OWNER','STAFF','MANAGER'])) }
  catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  // 10 creates / min per IP
  const rl = await limit(req.headers.get('x-forwarded-for') ?? 'tenant-create', {
    window: 60, limit: 10,
  })
  if (!rl.success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  const body = await req.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 })

  const norm = normalizeUSPhone(parsed.data.phoneNumber)
  if (!norm) return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })

  const { propertyId, name, unitNumber } = parsed.data

  // ensure property belongs to org
  const prop = await prisma.property.findFirst({
    where: { id: propertyId, organisationId: orgId },
    select: { id: true },
  })
  if (!prop) return NextResponse.json({ error: 'Property not found' }, { status: 404 })

  // upsert by composite unique (phoneNumber, propertyId) using normalized phone
  const tenant = await prisma.tenant.upsert({
    where: { phoneNumber_propertyId: { phoneNumber: norm, propertyId } },
    update: { name: name ?? undefined, unitNumber: unitNumber ?? undefined },
    create: { organisationId: orgId, propertyId, phoneNumber: norm, name, unitNumber },
  })

  // keep conversation pointer in sync (normalized phone)
  await prisma.conversation.upsert({
    where: { organisationId_phoneNumber: { organisationId: orgId, phoneNumber: norm } },
    update: { propertyId, state: 'IDLE', lastMessageAt: new Date(), tenantId: tenant.id },
    create: { organisationId: orgId, phoneNumber: norm, propertyId, state: 'IDLE', tenantId: tenant.id },
  })

  return NextResponse.json(tenant, { status: 201 })
}
