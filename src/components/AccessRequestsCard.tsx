// src/components/AccessRequestsCard.tsx
'use client'

import { useMemo, useState } from 'react'
import { format, addDays } from 'date-fns'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useAccessRequests } from '@/hooks/useAccessRequests'

type Props = {
  orgId?: string
  baseUrl: string
}

export default function AccessRequestsCard({ orgId, baseUrl }: Props) {
  const ar = useAccessRequests(orgId)

  // Defaults for approval → invite settings
  const [roleById, setRoleById] = useState<Record<string, 'MANAGER' | 'STAFF'>>({})
  const [daysById, setDaysById] = useState<Record<string, number>>({})

  const rows = useMemo(() => ar.list.data?.items ?? [], [ar.list.data])

  const getRole = (id: string) => roleById[id] || 'MANAGER'
  const getDays = (id: string) => Math.max(1, daysById[id] || 7)
  const expiresOn = (id: string) => format(addDays(new Date(), getDays(id)), 'yyyy-MM-dd')

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Access requests</h2>
          <p className="text-sm text-gray-600">
            People who asked for access to your org. Approve to send an invite automatically.
          </p>
        </div>
        <a
          href="/need-access"
          target="_blank"
          rel="noreferrer"
          className="text-sm text-blue-600 hover:underline"
        >
          Preview “Need access?” page →
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="mt-2 w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr className="border-b">
              <th className="px-4 py-3">Requester</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">Requested</th>
              <th className="px-4 py-3 w-[340px]">Approval</th>
            </tr>
          </thead>
          <tbody>
            {ar.list.isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-3">
                  <Skeleton className="h-6 w-full" />
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 align-top">
                  <td className="px-4 py-2">
                    <div className="font-medium">{r.name || '—'}</div>
                  </td>
                  <td className="px-4 py-2">{r.email}</td>
                  <td className="px-4 py-2 max-w-[360px]">
                    {r.message ? (
                      <span className="block truncate text-gray-700" title={r.message}>
                        {r.message}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2">{format(new Date(r.createdAt), 'yyyy-MM-dd')}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
                        value={getRole(r.id)}
                        onChange={(e) =>
                          setRoleById((m) => ({ ...m, [r.id]: e.target.value as 'MANAGER' | 'STAFF' }))
                        }
                      >
                        <option value="MANAGER">Manager</option>
                        <option value="STAFF">Staff</option>
                      </select>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700 whitespace-nowrap">Expires in</span>
                        <Input
                          type="number"
                          min={1}
                          max={90}
                          className="h-9 w-20"
                          value={getDays(r.id)}
                          onChange={(e) =>
                            setDaysById((m) => ({
                              ...m,
                              [r.id]: Number(e.target.value || 1),
                            }))
                          }
                        />
                        <span className="text-sm text-gray-700">days</span>
                        <Badge variant="outline" className="ml-1">
                          {expiresOn(r.id)}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        onClick={() =>
                          ar.approve.mutate({
                            requestId: r.id,
                            role: getRole(r.id),
                            expiresInDays: getDays(r.id),
                          })
                        }
                        disabled={ar.approve.isPending}
                      >
                        {ar.approve.isPending ? 'Approving…' : 'Approve & invite'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => ar.deny.mutate({ requestId: r.id })}
                        disabled={ar.deny.isPending}
                      >
                        {ar.deny.isPending ? 'Denying…' : 'Deny'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  No pending requests.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
