import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import logger from '@/lib/logger'
import { limit } from '@/lib/rate-limit'
import { requireSessionOrgRole } from '@/lib/auth'
import crypto from 'crypto'

/* GET /api/properties  (OWNER | MANAGER | STAFF) */
export async function GET(req: NextRequest) {
  let orgId: string
  try {
    ({ orgId } = await requireSessionOrgRole(['OWNER', 'MANAGER', 'STAFF']))
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const search = searchParams.get('search')?.trim() ?? ''

  // Guard bad input
  let page = Number(searchParams.get('page') ?? 1)
  let pageSize = Number(searchParams.get('pageSize') ?? 20)
  page = Number.isFinite(page) && page > 0 ? page : 1
  pageSize = Number.isFinite(pageSize) ? Math.min(Math.max(pageSize, 1), 200) : 20

  const where: Prisma.PropertyWhereInput = {
    organisationId: orgId,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { address: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const [total, items] = await prisma.$transaction([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return NextResponse.json({ total, items, page, pageSize })
}

/* POST /api/properties  (OWNER | MANAGER) */
const CreateSchema = z.object({
  name: z.string().min(2).max(100),
  address: z.string().min(5).max(255),
  phoneNumber: z.string().min(7).max(20).optional(), // optional in org-number routing
  managerId: z.string().cuid().optional(),
})

export async function POST(req: NextRequest) {
  let orgId: string
  try {
    ({ orgId } = await requireSessionOrgRole(['OWNER', 'MANAGER']))
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rl = await limit(req.headers.get('x-forwarded-for') ?? 'global-prop-create', {
    window: 60,
    limit: 2,
  })
  if (!rl.success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  const body = await req.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 })

  try {
    // Short synthetic identifier (<= 20 chars typical)
    const synthetic = `P-${orgId.slice(0, 4)}-${Date.now().toString(36).slice(-5)}-${crypto
      .randomUUID()
      .slice(0, 4)}`
    const property = await prisma.property.create({
      data: {
        ...parsed.data,
        organisationId: orgId,
        phoneNumber: parsed.data.phoneNumber ?? synthetic,
      },
    })
    logger.info({ propertyId: property.id }, 'Property created')
    return NextResponse.json(property, { status: 201 })
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Phone number already in use' }, { status: 409 })
    }
    logger.error({ err }, 'Property create failed')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
