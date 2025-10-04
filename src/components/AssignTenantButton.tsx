'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProperties } from '@/hooks/useProperties'
import { useAssignTenant } from '@/hooks/useAssignTenant'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'

type Props = {
  tenantId: string
  currentPropertyId?: string | null
  after?: () => void
}

export default function AssignTenantButton({ tenantId, currentPropertyId, after }: Props) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const router = useRouter()

  const props = useProperties({ page: 1, pageSize: 200 })
  const assign = useAssignTenant()

  const canSubmit = useMemo(() => (props.data?.items?.length ?? 0) > 0, [props.data])

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Assign to Property
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Card className="w-full max-w-md space-y-4 p-6">
            <h3 className="text-lg font-semibold">Assign tenant to property</h3>

            {/* property picker */}
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              defaultValue={currentPropertyId ?? ''}
              id="assign-property-picker"
            >
              <option value="" disabled hidden>
                Select a property
              </option>
              {props.data?.items?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* optional SMS note */}
            <Input
              placeholder="Optional SMS note to tenant"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!canSubmit}
                onClick={() => {
                  const el = document.getElementById(
                    'assign-property-picker'
                  ) as HTMLSelectElement | null
                  const propertyId = el?.value
                  if (!propertyId) return toast.error('Pick a property')

                  assign.mutate(
                    {
                      tenantId,
                      propertyId,
                      notify: !!note,
                      notifyMessage: note || undefined,
                    },
                    {
                      onSuccess: () => {
                        setOpen(false)
                        setNote('')
                        // Prefer caller hook, else soft-refresh the page
                        if (after) after()
                        else router.refresh()
                      },
                    }
                  )
                }}
              >
                Assign
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
