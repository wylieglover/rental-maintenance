'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTenants } from '@/hooks/useTenants'
import { useAssignTenant } from '@/hooks/useAssignTenant'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import toast from 'react-hot-toast'

type Props = {
  /** Property the selected tenant will be assigned to */
  targetPropertyId: string
  /** Optional callback after successful assign (otherwise router.refresh) */
  after?: () => void
  /** Optional class to style the trigger button */
  buttonClassName?: string
}

export default function TenantPickerButton({
  targetPropertyId,
  after,
  buttonClassName,
}: Props) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [notify, setNotify] = useState(false)
  const [note, setNote] = useState('')
  const [moveOpen, setMoveOpen] = useState(true)

  const { data, isLoading, refetch, isFetching } = useTenants({
    q,
    page: 1,
    pageSize: 10,
  })

  const assign = useAssignTenant()
  const router = useRouter()

  // tiny debounce for search UX
  useEffect(() => {
    const t = setTimeout(() => refetch(), 200)
    return () => clearTimeout(t)
  }, [q, refetch])

  const tenants = data?.items ?? []
  const disabled = assign.isPending

  const reset = () => {
    setQ('')
    setNotify(false)
    setNote('')
    setMoveOpen(true)
  }

  const onSuccess = () => {
    setOpen(false)
    reset()
    after ? after() : router.refresh()
  }

  return (
    <>
      <Button className={buttonClassName} variant="outline" onClick={() => setOpen(true)}>
        Assign existing tenant
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-xl space-y-4 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Assign existing tenant</h3>
              <button className="text-sm text-gray-500 hover:underline" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search name, phone, unit, or property…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                {isFetching ? 'Searching…' : 'Search'}
              </Button>
            </div>

            {/* Results */}
            <div className="max-h-[320px] overflow-auto rounded border">
              {isLoading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : tenants.length === 0 ? (
                <p className="p-4 text-sm text-gray-500">No tenants found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left">
                    <tr className="border-b">
                      <th className="px-3 py-2">Tenant</th>
                      <th className="px-3 py-2">Phone</th>
                      <th className="px-3 py-2">Current Property</th>
                      <th className="px-3 py-2 w-28">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((t) => {
                      const alreadyHere = t.property?.id === targetPropertyId
                      return (
                        <tr key={t.id} className="border-b last:border-0">
                          <td className="px-3 py-2">{t.name ?? 'Unnamed'}</td>
                          <td className="px-3 py-2">{t.phoneNumber}</td>
                          <td className="px-3 py-2">{t.property?.name ?? '—'}</td>
                          <td className="px-3 py-2">
                            <Button
                              size="sm"
                              disabled={alreadyHere || disabled}
                              onClick={() => {
                                assign.mutate(
                                  {
                                    tenantId: t.id,
                                    propertyId: targetPropertyId,
                                    moveOpenTickets: moveOpen,
                                    notify,
                                    notifyMessage: notify ? note || undefined : undefined,
                                  },
                                  {
                                    onSuccess: () => {
                                      toast.success('Tenant assigned')
                                      onSuccess()
                                    },
                                  }
                                )
                              }}
                            >
                              {alreadyHere ? 'Assigned' : 'Assign'}
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Options */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="rounded border-gray-300"
                  checked={moveOpen}
                  onChange={(e) => setMoveOpen(e.target.checked)}
                />
                Move any OPEN/IN&nbsp;PROGRESS tickets to the new property
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="rounded border-gray-300"
                  checked={notify}
                  onChange={(e) => setNotify(e.target.checked)}
                />
                Send SMS notification
              </label>

              <Input
                placeholder='Optional SMS note (e.g. "We’ve assigned your request to Main St Apts.")'
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={!notify}
              />
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  reset()
                  refetch()
                }}
              >
                Reset
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
