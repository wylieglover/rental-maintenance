// src/app/dashboard/layout.tsx
import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import DashboardNav from '@/components/DashboardNav'

export const dynamic = 'force-dynamic'

const STAFFY = new Set(['OWNER', 'MANAGER', 'STAFF'])

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/signin?callbackUrl=/dashboard')

  const role  = (session.user as any)?.role as string | undefined
  const orgId = (session.user as any)?.orgId as string | undefined

  // Tenants don’t belong in staff dashboard
  if (role === 'TENANT') {
    redirect('/tenant') // or redirect('/'), depending on your tenant UX
  }

  if (!orgId || !role || !STAFFY.has(role)) {
    redirect('/onboarding')
  }

  // Require: at least one property AND at least one active org number attached to a property
  const [hasProperty, hasAssignedActiveNumber] = await Promise.all([
    prisma.property.count({ where: { organisationId: orgId } }).then(n => n > 0),
    prisma.orgNumber.count({
      where: { organisationId: orgId, active: true, NOT: { propertyId: null } },
    }).then(n => n > 0),
  ])

  if (!hasProperty || !hasAssignedActiveNumber) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DashboardNav />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
