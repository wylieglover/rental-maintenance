'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  useOrgNumbers,
  useProvisionNumber,
  useAssignNumber,
} from '@/hooks/useOrgNumbers'
import { useProperties, useCreateProperty } from '@/hooks/useProperties'
import { useCreateOrg } from '@/hooks/useCreateOrg'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import toast from 'react-hot-toast'

export default function OnboardingPage() {
  const router = useRouter()
  const { data: session, status, update } = useSession()
  const user = session?.user
  const role = (session?.user as any)?.role as string | undefined
  const orgId = (user as any)?.orgId as string | undefined

  // local form state
  const [orgName, setOrgName] = useState('')
  const [orgSlug, setOrgSlug] = useState('')
  const [areaCode, setAreaCode] = useState('')
  const [attachNumber, setAttachNumber] = useState('')
  const [propertyName, setPropertyName] = useState('')
  const [propertyAddress, setPropertyAddress] = useState('')
  const [attachSelNum, setAttachSelNum] = useState<string>('')
  const [attachSelProp, setAttachSelProp] = useState<string>('')

  // hooks
  const createOrg = useCreateOrg()
  const numbers = useOrgNumbers(orgId)
  const provision = useProvisionNumber(orgId)
  const assign = useAssignNumber(orgId)

  const propsQuery = useProperties({ page: 1, pageSize: 100 }, { enabled: !!orgId })
  const createProperty = useCreateProperty()

  // derived
  const properties = propsQuery.data?.items ?? []
  const hasProperty = properties.length > 0

  const activeNumbers = useMemo(
    () => (numbers.data?.items ?? []).filter((n) => n.active),
    [numbers.data]
  )
  const assigned = activeNumbers.filter((n) => n.property?.id)
  const unassigned = activeNumbers.filter((n) => !n.property?.id)

  const hasAssignedNumber = assigned.length > 0
  const ready = !!orgId && hasProperty && hasAssignedNumber

  // redirect when complete
  useEffect(() => {
    const staffy = role === 'OWNER' || role === 'MANAGER' || role === 'STAFF'
    if (status === 'authenticated' && ready && staffy) {
      router.replace('/dashboard')
    }
  }, [status, ready, role, router])

  // Preselect when there’s exactly one property & one unassigned number
  useEffect(() => {
    if (unassigned.length === 1) setAttachSelNum(unassigned[0].id)
  }, [unassigned])
  useEffect(() => {
    if (properties.length === 1) setAttachSelProp(properties[0].id)
  }, [properties])

  if (status === 'loading') return <div className="p-6">Loading…</div>

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Card className="p-5 text-center space-y-3">
          <h1 className="text-lg font-semibold">Welcome</h1>
          <p className="text-gray-600">Please sign in to continue.</p>
          <a className="rounded bg-blue-600 px-4 py-2 text-white" href="/signin">
            Sign in
          </a>
        </Card>
      </main>
    )
  }

  // helpers
  function normalizeE164(v: string) {
    const digits = v.replace(/\D/g, '')
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
    if (digits.length === 10) return `+1${digits}`
    return v.startsWith('+') ? v : `+${digits}`
  }

  const handleAssign = async (override?: { numberId: string; propertyId: string }) => {
    const numberId = override?.numberId ?? attachSelNum
    const propertyId = override?.propertyId ?? attachSelProp
    if (!numberId || !propertyId) {
      toast.error('Pick a number and a property to attach.')
      return
    }
    await assign.mutateAsync({
      numberId,
      propertyId,
      exclusive: true,
      activate: true,
    })
    setAttachSelNum('')
    setAttachSelProp('')
    numbers.refetch()
  }

  // Quick-attach availability
  const canQuickAttach =
    !hasAssignedNumber && properties.length === 1 && unassigned.length === 1

  return (
    <main className="mx-auto max-w-2xl p-5 space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-bold">Let’s get you set up</h1>
        <p className="text-sm text-gray-600">
          Create your org, add a property, and attach a texting number to it.
        </p>
      </header>

      {/* 1) Org */}
      <Card className="p-4 space-y-3">
        <h2 className="text-base font-semibold">1) Create your organisation</h2>
        {orgId ? (
          <p className="text-xs text-green-700">Organisation connected ✅</p>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                placeholder="Organisation name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="h-9"
              />
              <Input
                placeholder="subdomain (slug)"
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value.toLowerCase())}
                className="h-9"
              />
            </div>
            <div className="text-[11px] text-gray-500">
              Slug must be lowercase letters, numbers, and dashes (e.g., <code>acme</code>).
            </div>
            <Button
              size="sm"
              onClick={async () => {
                if (!orgName || !orgSlug) return toast.error('Enter name and slug')
                await createOrg.mutateAsync({ name: orgName, slug: orgSlug })
                await update()
              }}
              disabled={createOrg.isPending}
            >
              {createOrg.isPending ? 'Creating…' : 'Create organisation'}
            </Button>
          </>
        )}
      </Card>

      {/* 2) First property */}
      <Card className="p-4 space-y-3">
        <h2 className="text-base font-semibold">2) Add your first property</h2>
        {hasProperty ? (
          <p className="text-xs text-green-700">At least one property exists ✅</p>
        ) : (
          <>
            <div className="grid gap-2">
              <Input
                placeholder="Property name"
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
                className="h-9"
              />
              <Input
                placeholder="Property address"
                value={propertyAddress}
                onChange={(e) => setPropertyAddress(e.target.value)}
                className="h-9"
              />
            </div>
            <Button
              size="sm"
              onClick={async () => {
                if (!propertyName || !propertyAddress) {
                  return toast.error('Enter name and address')
                }
                await createProperty.mutateAsync({
                  name: propertyName,
                  address: propertyAddress,
                })
                propsQuery.refetch()
              }}
              disabled={!orgId || createProperty.isPending}
            >
              {createProperty.isPending ? 'Creating…' : 'Create property'}
            </Button>
          </>
        )}
      </Card>

      {/* 3) Number */}
      <Card className="p-4 space-y-3">
        <h2 className="text-base font-semibold">3) Get a texting number</h2>
        {activeNumbers.length > 0 ? (
          <p className="text-xs text-green-700">
            You have {activeNumbers.length} active number{activeNumbers.length > 1 ? 's' : ''} ✅
          </p>
        ) : (
          <>
            {/* Purchase option */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Area code (optional, e.g., 415)"
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value)}
                className="h-9 max-w-[180px]"
              />
              <Button
                size="sm"
                onClick={() =>
                  provision.mutate({
                    mode: 'purchase',
                    type: 'LOCAL',
                    areaCode: areaCode || undefined,
                  })
                }
                disabled={!orgId || provision.isPending}
              >
                {provision.isPending ? 'Provisioning…' : 'Provision Local Number'}
              </Button>
            </div>

            {/* Attach-existing option (trial-friendly) */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Attach existing number (e.g., +15551234567)"
                value={attachNumber}
                onChange={(e) => setAttachNumber(e.target.value)}
                className="h-9 max-w-[260px]"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  provision.mutate({
                    mode: 'attach',
                    phoneNumber: normalizeE164(attachNumber),
                  })
                }
                disabled={!orgId || !attachNumber || provision.isPending}
              >
                {provision.isPending ? 'Attaching…' : 'Attach Existing Number'}
              </Button>
            </div>
            <p className="text-[11px] text-gray-500">
              On Twilio trial, the number must be in your Twilio account and SMS-capable. It can
              only text verified recipients.
            </p>
          </>
        )}

        {/* Small status list */}
        {activeNumbers.length > 0 && (
          <div className="text-xs text-gray-600">
            {activeNumbers.map((n) => (
              <div key={n.id} className="mt-1">
                <Badge variant={n.property ? 'success' : 'default'} className="mr-2">
                  {n.property ? 'Assigned' : 'Unassigned'}
                </Badge>
                {n.e164} {n.property ? `→ ${n.property.name}` : ''}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 4) Attach number to a property */}
      <Card className="p-4 space-y-3">
        <h2 className="text-base font-semibold">4) Attach a number to a property</h2>

        {/* Quick-attach banner when there’s exactly one of each */}
        {canQuickAttach && (
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="text-sm">
              Quick attach:&nbsp;
              <span className="font-medium">{unassigned[0].e164}</span> →{' '}
              <span className="font-medium">{properties[0].name}</span>
            </div>
            <Button
              size="sm"
              onClick={() =>
                handleAssign({ numberId: unassigned[0].id, propertyId: properties[0].id })
              }
              disabled={assign.isPending}
            >
              {assign.isPending ? 'Attaching…' : 'Attach now'}
            </Button>
          </div>
        )}

        {hasAssignedNumber ? (
          <p className="text-xs text-green-700">
            At least one active number is attached to a property ✅
          </p>
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm"
                value={attachSelNum}
                onChange={(e) => setAttachSelNum(e.target.value)}
                disabled={unassigned.length === 0}
              >
                <option value="">Select active number…</option>
                {unassigned.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.e164}
                  </option>
                ))}
              </select>
              <select
                className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm"
                value={attachSelProp}
                onChange={(e) => setAttachSelProp(e.target.value)}
                disabled={!hasProperty}
              >
                <option value="">Select property…</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Button
                size="sm"
                onClick={() => handleAssign()}
                disabled={!attachSelNum || !attachSelProp || assign.isPending}
              >
                {assign.isPending ? 'Attaching…' : 'Attach number'}
              </Button>
            </div>
            {unassigned.length === 0 && (
              <p className="text-[11px] text-gray-500">
                No unassigned active numbers. Provision or attach one above, then assign it here.
              </p>
            )}
          </>
        )}
      </Card>

      {/* Done */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">All set?</p>
            <p className="text-xs text-gray-600">
              You can continue when you have an org, at least one property, and at least one active
              number attached to a property.
            </p>
          </div>
          <Button size="sm" onClick={() => router.replace('/dashboard')} disabled={!ready}>
            Go to Dashboard
          </Button>
        </div>
      </Card>
    </main>
  )
}
