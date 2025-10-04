'use client'

import { useMemo } from 'react'
import { useOrgNumbers, useAssignNumber } from '@/hooks/useOrgNumbers'

type InitialAssigned = { id: string; e164: string; active: boolean }

type OrgNumItem = {
  id: string
  e164: string
  active: boolean
  property?: { id: string; name?: string } | null
}

export default function PropertyNumberQuickActions(props: {
  orgId: string
  propertyId: string
  initialAssigned: InitialAssigned[]
}) {
  const { orgId, propertyId, initialAssigned } = props

  const { data, isLoading } = useOrgNumbers(orgId)
  const assign = useAssignNumber(orgId)

  const all: OrgNumItem[] = (data?.items ?? []) as OrgNumItem[]
  const attachable = useMemo(
    () => all.filter((n) => !n.property || n.property?.id === propertyId),
    [all, propertyId]
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-gray-700">Attach a number:</label>
        <select
          className="h-9 min-w-[220px] rounded-md border border-gray-300 bg-white px-2 text-sm"
          disabled={isLoading || assign.isPending || attachable.length === 0}
          defaultValue=""
          onChange={(e) => {
            const numberId = e.target.value
            if (!numberId) return
            assign.mutate({ numberId, propertyId, exclusive: true, activate: true })
            e.currentTarget.selectedIndex = 0
          }}
        >
          <option value="">Choose number…</option>
          {attachable.map((n) => (
            <option key={n.id} value={n.id}>
              {n.e164} {n.property ? '(attached here)' : ''}
            </option>
          ))}
        </select>
      </div>

      {initialAssigned.length === 0 ? (
        <p className="text-sm text-gray-500">No numbers currently attached.</p>
      ) : (
        <ul className="space-y-1">
          {initialAssigned.map((n) => (
            <li
              key={n.id}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <span className="text-sm">
                {n.e164} {n.active ? '• active' : '• inactive'}
              </span>
              <button
                className="text-sm text-red-600 hover:underline"
                onClick={() => assign.mutate({ numberId: n.id, propertyId: null })}
              >
                Detach
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
