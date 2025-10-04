import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrgRole } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  const { id: orgId, inviteId } = await params
  await requireOrgRole(orgId, ['OWNER', 'MANAGER'])

  await prisma.orgInvite.delete({ where: { id: inviteId } })
  return new Response(null, { status: 204 })
}
