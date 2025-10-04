import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { limit } from '@/lib/rate-limit'
import logger from '@/lib/logger'
import { requireSessionOrgRole } from '@/lib/auth'

function notFound() {
  return NextResponse.json({ error: 'Property not found' }, { status: 404 })
}

// { name?, address?, phoneNumber?, managerId? }
const PatchSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    address: z.string().min(5).max(255).optional(),
    phoneNumber: z.string().min(7).max(20).optional(),
    managerId: z.string().cuid().optional(),
  })
  .refine((v) => Object.keys(v).length, { message: 'Empty body' })

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let orgId: string
  try {
    ({ orgId } = await requireSessionOrgRole(['OWNER', 'MANAGER']))
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rl = await limit(`prop-patch:${params.id}`)
  if (!rl.success) return NextResponse.json({ error: 'Too many updates' }, { status: 429 })

  const body = await req.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 })

  const exists = await prisma.property.findFirst({
    where: { id: params.id, organisationId: orgId },
    select: { id: true },
  })
  if (!exists) return notFound()

  const updated = await prisma.property.update({ where: { id: params.id }, data: parsed.data })
  logger.info({ propertyId: params.id }, 'Property updated')
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  let orgId: string
  try {
    ({ orgId } = await requireSessionOrgRole(['OWNER', 'MANAGER']))
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const exists = await prisma.property.findFirst({
    where: { id: params.id, organisationId: orgId },
    select: { id: true },
  })
  if (!exists) return notFound()

  await prisma.property.delete({ where: { id: params.id } })
  logger.info({ propertyId: params.id }, 'Property deleted')
  return NextResponse.json({}, { status: 204 })
}
