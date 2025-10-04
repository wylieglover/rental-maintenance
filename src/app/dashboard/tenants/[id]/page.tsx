import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import BackButton from '@/components/BackButton'
import AssignTenantButton from '@/components/AssignTenantButton'
import { PriorityBadge } from '@/components/PriorityBadge'
import { Card } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

// await params (Next 15)
export default async function TenantDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const session = await auth()
  const orgId = (session?.user as any)?.orgId as string | undefined
  if (!orgId) notFound()

  const tenant = await prisma.tenant.findFirst({
    where: { id, organisationId: orgId },
    include: {
      property: { select: { id: true, name: true, address: true } },
      tickets: {
        orderBy: { createdAt: 'desc' },
        include: { property: { select: { id: true, name: true } } },
      },
    },
  })
  if (!tenant) notFound()

  const role = (session?.user as { role?: string } | undefined)?.role
  const canEdit = role === 'MANAGER' || role === 'STAFF' || role === 'OWNER'

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <BackButton fallback="/dashboard/tenants" />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {tenant.name || 'Tenant'}
            </h1>
            <p className="text-sm text-gray-600">
              {tenant.property?.name ?? '—'}
            </p>
          </div>
        </div>
        {canEdit && (
          <AssignTenantButton
            tenantId={tenant.id}
            currentPropertyId={tenant.property?.id}
            after={undefined}
          />
        )}
      </header>

      {/* Info */}
      <Card className="p-4 sm:p-5">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase text-gray-500">Name</dt>
            <dd className="mt-1 text-sm">{tenant.name || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-500">Phone</dt>
            <dd className="mt-1 text-sm">{tenant.phoneNumber}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-gray-500">Unit</dt>
            <dd className="mt-1 text-sm">{tenant.unitNumber || '—'}</dd>
          </div>
        </dl>
      </Card>

      {/* Tickets */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Tickets</h2>
        <Card className="overflow-hidden">
          {tenant.tickets.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No tickets for this tenant.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr className="border-b">
                  <th className="px-4 py-2.5">ID</th>
                  <th className="px-4 py-2.5">Property</th>
                  <th className="px-4 py-2.5">Priority</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Created</th>
                </tr>
              </thead>
              <tbody>
                {tenant.tickets.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50/60">
                    <td className="px-4 py-2">
                      <Link href={`/dashboard/tickets/${t.id}`} className="text-blue-600 hover:underline">
                        #{t.id.slice(-6)}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{t.property?.name ?? '—'}</td>
                    <td className="px-4 py-2"><PriorityBadge priority={t.priority as any} /></td>
                    <td className="px-4 py-2">{t.status}</td>
                    <td className="px-4 py-2">{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>
    </div>
  )
}
