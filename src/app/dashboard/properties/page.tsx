'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  useProperties,
  useCreateProperty,
  useUpdateProperty,
  useDeleteProperty
} from '@/hooks/useProperties'
import { useOrgNumbers } from '@/hooks/useOrgNumbers'
import { Property } from '@/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Pencil, Trash, Plus, Loader2, AlertCircle } from 'lucide-react'

function visibleLegacyPhone(v?: string | null) {
  if (!v) return ''
  const synthetic = v.startsWith('PROP-') || v.startsWith('UNASSIGNED-')
  return synthetic ? '' : v
}

export default function PropertiesPage() {
  /* pagination */
  const [page, setPage] = useState(1)
  const pageSize = 25

  const { data, isLoading, error, refetch } = useProperties({ page, pageSize })
  const properties: Property[] = data?.items ?? []
  const total = data?.total ?? 0
  const last = Math.max(1, Math.ceil(total / pageSize))

  /* session → orgId for numbers query */
  const { data: session } = useSession()
  const orgId = (session?.user as any)?.orgId as string | undefined

  /* load org numbers and index by propertyId */
  const numbers = useOrgNumbers(orgId)
  const numbersByProperty = useMemo(() => {
    const map = new Map<string, string[]>()
    const list = numbers.data?.items ?? []
    for (const n of list) {
      const pid = (n as any).propertyId as string | null
      if (!pid) continue
      const arr = map.get(pid) ?? []
      arr.push(n.e164)
      map.set(pid, arr)
    }
    return map
  }, [numbers.data?.items])

  /* form state (create/edit) */
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Property | null>(null)
  const [name, setName] = useState('')
  const [addr, setAddr] = useState('')
  const [phone, setPhone] = useState('')

  const create = useCreateProperty()
  const update = useUpdateProperty()
  const del = useDeleteProperty()

  const isCreate = !editing
  // Phone is now optional even on create
  const formValid =
    name.trim().length >= 2 &&
    addr.trim().length >= 5

  const save = () => {
    const dto = { name, address: addr, phoneNumber: phone || undefined }
    if (editing) {
      update.mutate({ id: editing.id, ...dto }, { onSuccess: reset })
    } else {
      create.mutate(dto, { onSuccess: reset })
    }
  }

  function reset() {
    setOpen(false)
    setEditing(null)
    setName('')
    setAddr('')
    setPhone('')
    refetch()
  }

  function edit(p: Property) {
    setEditing(p)
    setName(p.name)
    setAddr(p.address)
    setPhone(visibleLegacyPhone(p.phoneNumber))
    setOpen(true)
  }

  /* loading */
  if (isLoading)
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Manage your property portfolio
                </p>
              </div>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Card className="space-y-4 p-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </Card>
        </div>
      </div>
    )

  /* error */
  if (error)
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Manage your property portfolio
                </p>
              </div>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Card className="max-w-md mx-auto space-y-4 p-8 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
            <p>{(error as any)?.message ?? 'Failed to load properties'}</p>
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </Card>
        </div>
      </div>
    )

  /* render */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage your property portfolio
              </p>
            </div>

            <Button
              onClick={() => {
                if (!open) {
                  setEditing(null)
                  setName('')
                  setAddr('')
                  setPhone('')
                }
                setOpen((v) => !v)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {open ? 'Close' : 'Add Property'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* form (create / edit) */}
        {open && (
          <Card className="space-y-4 p-6">
            <div className="grid gap-4 md:grid-cols-3">
              <Input
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                placeholder="Address"
                value={addr}
                onChange={(e) => setAddr(e.target.value)}
              />
              <Input
                // clearer label
                placeholder="Phone (optional, legacy — leave blank if using Twilio numbers)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            {/* show attached Twilio numbers (read-only) so the edit form matches the table */}
            {editing && (
              <p className="text-xs text-gray-500">
                Incoming number(s):{' '}
                {(numbersByProperty.get(editing.id) ?? []).join(', ') || '—'}
                {' '}• Manage mapping on the property page.
              </p>
            )}

            <div className="flex gap-4">
              <Button
                onClick={save}
                disabled={!formValid || create.isPending || update.isPending}
              >
                {create.isPending || update.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editing ? (
                  'Save changes'
                ) : (
                  'Create property'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false)
                  setEditing(null)
                }}
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {/* list */}
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr className="border-b">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Incoming Number(s)</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((p) => {
                const e164s = numbersByProperty.get(p.id) ?? []
                return (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-4 py-2">
                      <Link
                        href={`/dashboard/properties/${p.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{p.address}</td>
                    <td className="px-4 py-2">
                      {numbers.isLoading
                        ? 'Loading…'
                        : e164s.length
                          ? e164s.join(', ')
                          : '—'}
                    </td>
                    <td className="px-4 py-2">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button title="Edit" onClick={() => edit(p)}>
                          <Pencil className="h-4 w-4 text-blue-600" />
                        </button>
                        <button
                          title="Delete"
                          onClick={() => {
                            if (confirm(`Delete property "${p.name}"? This cannot be undone.`)) {
                              del.mutate(p.id, { onSuccess: () => refetch() })
                            }
                          }}
                        >
                          <Trash className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {properties.length === 0 && (
            <p className="p-6 text-center text-gray-500">No properties yet.</p>
          )}
        </Card>

        {/* pagination */}
        {total > pageSize && (
          <div className="flex items-center justify-end gap-4">
            <span className="text-sm text-gray-600">
              Page {page} of {last}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === last}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}