'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useProperties } from '@/hooks/useProperties'
import { useCreateTenant } from '@/hooks/useCreateTenant'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import toast from 'react-hot-toast'

type Props = {
  /** Optional: preselect a property (e.g., from property detail page) */
  defaultPropertyId?: string
  /** Optional callback after tenant is created */
  after?: () => void
}

export default function CreateTenantButton({ defaultPropertyId, after }: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('')
  const [phone, setPhone] = useState('')
  const [propertyId, setPropertyId] = useState<string | ''>(defaultPropertyId ?? '')

  const { data: propsData } = useProperties({ page: 1, pageSize: 200 })
  const props = propsData?.items ?? []

  const create = useCreateTenant()
  const router = useRouter()

  const canSubmit = useMemo(() => {
    const digits = phone.replace(/\D/g, '')
    return propertyId && digits.length >= 7
  }, [propertyId, phone])

  const reset = () => {
    if (!defaultPropertyId) setPropertyId('')
    setName('')
    setUnit('')
    setPhone('')
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ New Tenant</Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Card className="w-full max-w-md space-y-4 p-6">
            <h3 className="text-lg font-semibold">Create tenant</h3>

            {/* Property */}
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
            >
              <option value="" disabled hidden>
                Select a property
              </option>
              {props.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Name (optional) */}
            <Input
              placeholder="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            {/* Unit (optional) */}
            <Input
              placeholder="Unit (optional)"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />

            {/* Phone (required) */}
            <Input
              placeholder="Phone (required)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!canSubmit || create.isPending}
                onClick={() =>
                  create.mutate(
                    {
                      propertyId: propertyId as string,
                      phoneNumber: phone,
                      name: name || undefined,
                      unitNumber: unit || undefined,
                    },
                    {
                      onSuccess: () => {
                        toast.success('Tenant created')
                        setOpen(false)
                        reset()
                        after ? after() : router.refresh()
                      },
                    }
                  )
                }
              >
                {create.isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
