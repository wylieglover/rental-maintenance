import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrgRole } from '@/lib/auth'

// GET → list Twilio numbers for an org (OWNER/MANAGER)
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params

  // Enforce role per-org (not global)
  await requireOrgRole(id, ['OWNER', 'MANAGER'])

  const numbers = await prisma.orgNumber.findMany({
    where: { organisationId: id },
    orderBy: { createdAt: 'desc' },
    include: { property: { select: { id: true, name: true } } },
  })

  return NextResponse.json({ items: numbers })
}
