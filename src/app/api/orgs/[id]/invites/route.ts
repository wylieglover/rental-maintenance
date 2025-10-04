// src/app/api/orgs/[id]/invites/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrgRole } from '@/lib/auth'
import { z } from 'zod'
import { limit } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CreateSchema = z.object({
  email: z.string().email(),
  role: z.enum(['MANAGER', 'STAFF']).default('STAFF'),
  expiresInDays: z.number().int().min(1).max(90).optional(), // NEW
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orgId } = await params
  await requireOrgRole(orgId, ['OWNER', 'MANAGER'])

  const invites = await prisma.orgInvite.findMany({
    where: { organisationId: orgId, acceptedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, email: true, role: true, token: true,
      createdAt: true, expiresAt: true, acceptedAt: true,
    },
  })

  return NextResponse.json({ items: invites })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orgId } = await params
  const { userId } = await requireOrgRole(orgId, ['OWNER', 'MANAGER'])

  const rl = await limit(`invite:create:${orgId}`, { window: 60, limit: 10 })
  if (!rl.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const raw = await req.json().catch(() => null)
  const parsed = CreateSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { email, role, expiresInDays } = parsed.data
  const days = expiresInDays ?? 14
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  const token = crypto.randomUUID().replace(/-/g, '')

  const invite = await prisma.orgInvite.create({
    data: {
      organisationId: orgId,
      email,
      role,
      token,
      expiresAt,
      invitedByUserId: userId,
    },
    select: {
      id: true, email: true, role: true, token: true,
      createdAt: true, expiresAt: true, acceptedAt: true,
    },
  })

  return NextResponse.json(invite, { status: 201 })
}
