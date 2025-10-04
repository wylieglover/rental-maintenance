// src/app/dashboard/properties/[id]/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { PriorityBadge } from '@/components/PriorityBadge'
import AssignTenantButton from '@/components/AssignTenantButton'
import CreateTenantButton from '@/components/CreateTenantButton'
import TenantPickerButton from '@/components/TenantPickerButton'
import TenantImport from '@/components/TenantImport'
import PropertyNumberQuickActions from '@/components/PropertyNumberQuickActionsClient'
import { Card } from '@/components/ui/card'
import BackButton from '@/components/BackButton'

export const dynamic = 'force-dynamic'

// NOTE: await params (Next 15)
export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const session = await auth()
  const orgId = (session?.user as any)?.orgId as string | undefined
  if (!orgId) notFound()

  const property = await prisma.property.findFirst({
    where: { id, organisationId: orgId },
    include: {
      tenants: { orderBy: { createdAt: 'desc' } },
      tickets: { orderBy: { createdAt: 'desc' } },
    },
  })
  if (!property) notFound()

  const assignedNumbers = await prisma.orgNumber.findMany({
    where: { organisationId: orgId, propertyId: property.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, e164: true, active: true },
  })

  const role = (session?.user as { role?: string } | undefined)?.role
  const canEdit = role === 'MANAGER' || role === 'STAFF' || role === 'OWNER'

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <BackButton fallback="/dashboard/properties" label="Back" />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{property.name}</h1>
            <p className="text-sm text-gray-600">{property.address}</p>
          </div>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <TenantPickerButton targetPropertyId={property.id} />
            <CreateTenantButton defaultPropertyId={property.id} />
          </div>
        )}
      </header>

      {/* Manage row: Numbers + Import */}
      {canEdit && (
        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="space-y-3 p-4 sm:p-5">
            <h2 className="text-base font-medium">Incoming number(s)</h2>
            <PropertyNumberQuickActions
              orgId={orgId}
              propertyId={property.id}
              initialAssigned={assignedNumbers}
            />
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="space-y-2">
              <h2 className="text-base font-medium">Bulk import tenants</h2>
              <p className="text-xs text-gray-500">
                Upload a CSV/XLSX with <code>phone</code> (required), <code>name</code> (optional),
                and <code>unit</code> (optional). Phones are normalized to E.164 (+1…).
                The property is fixed to this page’s property.
              </p>
              <div className="-mx-1">
                <TenantImport propertyId={property.id} />
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* Tenants */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Tenants</h2>
        <Card className="overflow-hidden">
          {property.tenants.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No tenants recorded.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr className="border-b">
                  <th className="px-4 py-2.5">Tenant</th>
                  <th className="px-4 py-2.5">Phone</th>
                  <th className="px-4 py-2.5">Unit</th>
                  {canEdit && <th className="px-4 py-2.5 w-44">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {property.tenants.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50/60">
                    <td className="px-4 py-2">
                      <Link
                        href={`/dashboard/tenants/${t.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {t.name ?? 'Unnamed'}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{t.phoneNumber}</td>
                    <td className="px-4 py-2">{t.unitNumber ?? '—'}</td>
                    {canEdit && (
                      <td className="px-4 py-2">
                        <AssignTenantButton tenantId={t.id} currentPropertyId={property.id} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>

      {/* Tickets */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Tickets</h2>
        <Card className="overflow-hidden">
          {property.tickets.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No maintenance tickets.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr className="border-b">
                  <th className="px-4 py-2.5">ID</th>
                  <th className="px-4 py-2.5">Priority</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Created</th>
                </tr>
              </thead>
              <tbody>
                {property.tickets.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50/60">
                    <td className="px-4 py-2">
                      <Link
                        href={`/dashboard/tickets/${t.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        #{t.id.slice(-6)}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <PriorityBadge priority={t.priority as any} />
                    </td>
                    <td className="px-4 py-2">{t.status}</td>
                    <td className="px-4 py-2">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
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
