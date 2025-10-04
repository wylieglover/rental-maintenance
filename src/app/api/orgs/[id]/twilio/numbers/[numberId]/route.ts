import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { limit } from '@/lib/rate-limit'
import { twilioClient } from '@/lib/twilio'
import { requireOrgRole } from '@/lib/auth'

type PatchBody = { propertyId: string | null; exclusive?: boolean; activate?: boolean }
type DeleteBody = { release?: boolean }

// ------------------------------
// PATCH → map number ↔ property
// Body: { propertyId: string | null, exclusive?: boolean, activate?: boolean }
// ------------------------------
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; numberId: string }> }
) {
  const { id, numberId } = await ctx.params
  await requireOrgRole(id, ['OWNER', 'MANAGER'])

  const body = (await req.json().catch(() => null)) as PatchBody | null
  if (!body || typeof body.propertyId === 'undefined') {
    return NextResponse.json({ error: 'propertyId (or null) is required' }, { status: 400 })
  }

  // Validate number belongs to org
  const number = await prisma.orgNumber.findFirst({
    where: { id: numberId, organisationId: id },
    select: { id: true },
  })
  if (!number) return NextResponse.json({ error: 'Number not found' }, { status: 404 })

  // Validate property if attaching
  if (body.propertyId) {
    const prop = await prisma.property.findFirst({
      where: { id: body.propertyId, organisationId: id },
      select: { id: true },
    })
    if (!prop) return NextResponse.json({ error: 'Property not found' }, { status: 404 })
  }

  const exclusive = !!body.exclusive
  const activate = body.activate ?? true

  const updated = await prisma.$transaction(async (tx) => {
    if (exclusive && body.propertyId) {
      // Deactivate other numbers already mapped to that property
      await tx.orgNumber.updateMany({
        where: {
          organisationId: id,
          propertyId: body.propertyId,
          id: { not: numberId },
        },
        data: { active: false },
      })
    }

    return tx.orgNumber.update({
      where: { id: numberId },
      data: {
        propertyId: body.propertyId,
        ...(activate ? { active: true } : {}),
      },
      include: { property: { select: { id: true, name: true } } },
    })
  })

  return NextResponse.json({ success: true, number: updated })
}

// ------------------------------
// DELETE → soft deactivate or release
// ------------------------------
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; numberId: string }> }
) {
  const { id, numberId } = await ctx.params
  await requireOrgRole(id, ['OWNER', 'MANAGER'])

  // 10 deletes / 5 min per org
  const rl = await limit(`org:${id}:numbers:delete`, { window: 300, limit: 10 })
  if (!rl.success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  const { release = false } = (await req.json().catch(() => ({}))) as DeleteBody

  const number = await prisma.orgNumber.findFirst({
    where: { id: numberId, organisationId: id },
  })
  if (!number) return NextResponse.json({ error: 'Number not found' }, { status: 404 })

  if (release) {
    try {
      await twilioClient.incomingPhoneNumbers(number.twilioSid).remove()
    } catch (err: any) {
      return NextResponse.json(
        { error: `Twilio release failed: ${err?.message ?? 'Unknown error'}` },
        { status: 502 }
      )
    }
    await prisma.orgNumber.delete({ where: { id: number.id } })
    return new Response(null, { status: 204 }) // ← proper empty 204
  }

  await prisma.orgNumber.update({ where: { id: number.id }, data: { active: false } })
  return NextResponse.json({ success: true })
}
