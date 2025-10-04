// POST → mark a Twilio number active (optionally exclusively)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { limit } from '@/lib/rate-limit'
import { requireOrgRole } from '@/lib/auth'

function parseBool(v: string | null): boolean {
  return v === '1' || v?.toLowerCase() === 'true'
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; numberId: string }> }
) {
  const { id, numberId } = await ctx.params
  await requireOrgRole(id, ['OWNER', 'MANAGER'])

  const rl = await limit(`org:${id}:numbers:activate`)
  if (!rl.success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  const number = await prisma.orgNumber.findFirst({
    where: { id: numberId, organisationId: id },
    select: { id: true, propertyId: true },
  })
  if (!number) return NextResponse.json({ error: 'Number not found' }, { status: 404 })

  const exclusive = parseBool(req.nextUrl.searchParams.get('exclusive'))

  const updated = await prisma.$transaction(async (tx) => {
    if (exclusive) {
      // If the number is mapped to a property, exclusivity only within that property
      const whereOthers =
        number.propertyId
          ? { organisationId: id, propertyId: number.propertyId, id: { not: numberId } }
          : { organisationId: id, id: { not: numberId } }

      await tx.orgNumber.updateMany({
        where: whereOthers,
        data: { active: false },
      })
    }

    return tx.orgNumber.update({ where: { id: numberId }, data: { active: true } })
  })

  return NextResponse.json({ success: true, number: updated })
}
