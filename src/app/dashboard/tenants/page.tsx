'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useTenants } from '@/hooks/useTenants'
import { useProperties } from '@/hooks/useProperties'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import AssignTenantButton from '@/components/AssignTenantButton'
import { RefreshCw, Filter } from 'lucide-react'

export default function TenantsPage() {
  const [q, setQ] = useState('')
  const [propertyId, setPropertyId] = useState<string>('all')
  const [page, setPage] = useState(1)
  const pageSize = 25

  // list tenants
  const tenants = useTenants({
    q,
    propertyId: propertyId === 'all' ? undefined : propertyId,
    page,
    pageSize
  })

  // list properties for filter + assignment target
  const props = useProperties({ page: 1, pageSize: 200 })

  const total = tenants.data?.total ?? 0
  const lastPage = Math.max(1, Math.ceil(total / pageSize))

  // debounce query typing a bit
  useEffect(() => {
    const t = setTimeout(() => setPage(1), 300)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Tenants
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage tenants across all properties
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={() => tenants.refetch()} disabled={tenants.isLoading}>
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${
                    tenants.isLoading ? 'animate-spin' : ''
                  }`}
                />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                Search:
              </span>
              <Input
                placeholder="Search by name or phone…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-64"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                Property:
              </span>
              <select
                value={propertyId}
                onChange={(e) => {
                  setPropertyId(e.target.value)
                  setPage(1)
                }}
                className="h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm"
              >
                <option value="all">All properties</option>
                {props.data?.items?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Tenant table */}
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr className="border-b">
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Property</th>
                <th className="px-4 py-3 w-44">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6">
                    <Skeleton className="h-6 w-full" />
                  </td>
                </tr>
              ) : tenants.data?.items?.length ? (
                tenants.data.items.map((t) => (
                  <tr key={t.id} className="border-b last:border-0">
                    <td className="px-4 py-2">
                      <Link href={`/dashboard/tenants/${t.id}`} className="text-blue-600 hover:underline">
                        {t.name ?? '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      {t.phoneNumber ? (
                        <a href={`tel:${t.phoneNumber}`} className="text-blue-600 hover:underline">
                          {t.phoneNumber}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-2">{t.unitNumber ?? '—'}</td>
                    <td className="px-4 py-2">
                      {t.property?.name ? (
                        <Link href={`/dashboard/properties/${t.property.id}`} className="text-blue-600 hover:underline">
                          {t.property.name}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <AssignTenantButton
                        tenantId={t.id}
                        currentPropertyId={t.propertyId}
                        after={() => tenants.refetch()}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    No tenants found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        {/* Pagination */}
        {total > pageSize && (
          <div className="flex items-center justify-end gap-4">
            <span className="text-sm text-gray-600">
              Page {page} of {lastPage}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === lastPage}
              onClick={() => setPage((p) => Math.min(p + 1, lastPage))}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}