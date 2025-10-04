// POST → attach/detach a number to a property (OWNER/MANAGER, org-scoped)
// Body: { propertyId: string | null, exclusive?: boolean, activate?: boolean }
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrgRole } from '@/lib/auth'

type Body = {
  propertyId: string | null
  exclusive?: boolean
  activate?: boolean
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; numberId: string }> }
) {
  const { id, numberId } = await ctx.params
  await requireOrgRole(id, ['OWNER', 'MANAGER'])

  const body = (await req.json().catch(() => null)) as Body | null
  if (!body || typeof body.propertyId === 'undefined') {
    return NextResponse.json({ error: 'propertyId (or null) is required' }, { status: 400 })
  }

  // Validate property (when not detaching)
  if (body.propertyId) {
    const prop = await prisma.property.findFirst({
      where: { id: body.propertyId, organisationId: id },
      select: { id: true },
    })
    if (!prop) return NextResponse.json({ error: 'Property not found' }, { status: 404 })
  }

  const num = await prisma.orgNumber.findFirst({
    where: { id: numberId, organisationId: id },
    select: { id: true },
  })
  if (!num) return NextResponse.json({ error: 'Number not found' }, { status: 404 })

  const exclusive = !!body.exclusive
  const activate  = body.activate ?? true

  const updated = await prisma.$transaction(async (tx) => {
    if (exclusive && body.propertyId) {
      // Turn off other numbers for that same property
      await tx.orgNumber.updateMany({
        where: { organisationId: id, propertyId: body.propertyId, id: { not: numberId } },
        data: { active: false },
      })
    }

    return tx.orgNumber.update({
      where: { id: numberId },
      data: { propertyId: body.propertyId, active: activate ? true : undefined },
      include: { property: { select: { id: true, name: true } } },
    })
  })

  return NextResponse.json({ success: true, number: updated })
}
