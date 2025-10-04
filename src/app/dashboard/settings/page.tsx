// src/app/dashboard/settings/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  useOrgNumbers,
  useProvisionNumber,
  useActivateNumber,
  useDeactivateNumber,
  useReleaseNumber,
  useAssignNumber,
} from '@/hooks/useOrgNumbers'
import { useProperties } from '@/hooks/useProperties'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import TeamInvitesCard from '@/components/TeamInvitesCard'
import AccessRequestsCard from '@/components/AccessRequestsCard'

export default function SettingsPage() {
  const { data: session } = useSession()
  const orgId = (session?.user as any)?.orgId as string | undefined

  // Numbers
  const numbers = useOrgNumbers(orgId)
  const provision = useProvisionNumber(orgId)
  const activate = useActivateNumber(orgId)
  const deactivate = useDeactivateNumber(orgId)
  const release = useReleaseNumber(orgId)
  const assign = useAssignNumber(orgId)

  const propsQuery = useProperties({ page: 1, pageSize: 500 })
  const properties = propsQuery.data?.items ?? []

  const [type, setType] = useState<'LOCAL' | 'TOLLFREE'>('LOCAL')
  const [areaCode, setAreaCode] = useState('')
  const [exact, setExact] = useState('')

  const onProvision = () => {
    if (!orgId || provision.isPending) return
    if (exact.trim()) {
      provision.mutate({ mode: 'attach', phoneNumber: exact.trim() })
    } else {
      provision.mutate({ type, areaCode: areaCode || undefined })
    }
  }

  const baseUrl =
    (typeof window !== 'undefined' && window.location.origin) ||
    (process.env.NEXT_PUBLIC_APP_URL ?? '')

  const email = session?.user?.email ?? '—'
  const role = (session?.user as any)?.role ?? '—'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Organisation Settings
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage your team access and Twilio numbers
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right text-sm">
                <p className="font-medium text-gray-900">{email}</p>
                <p className="text-gray-500">Role: {role}</p>
              </div>
              <Link href="/signout">
                <Button variant="outline" size="sm">Sign out</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Access requests (new) */}
        <section>
          <AccessRequestsCard orgId={orgId} baseUrl={baseUrl} />
        </section>

        {/* Team invites */}
        <section>
          <TeamInvitesCard orgId={orgId} baseUrl={baseUrl} />
        </section>

        {/* Provision number */}
        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">Provision a number</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
              >
                <option value="LOCAL">Local (SMS/MMS)</option>
                <option value="TOLLFREE">Toll-free</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Area code</label>
              <Input
                placeholder="Optional (e.g. 415)"
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Exact number</label>
              <Input
                placeholder="Attach existing (+1XXXXXXXXXX)"
                value={exact}
                onChange={(e) => setExact(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={onProvision} disabled={!orgId || provision.isPending}>
              {provision.isPending ? 'Provisioning…' : 'Provision number'}
            </Button>
            <p className="text-xs text-gray-500">
              If an exact number is provided, we'll attach it and auto-configure the webhook.
            </p>
          </div>
        </Card>

        {/* Numbers table */}
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr className="border-b">
                <th className="px-4 py-3">E.164 Number</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assigned to</th>
                <th className="px-4 py-3">Twilio SID</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 w-56">Actions</th>
              </tr>
            </thead>
            <tbody>
              {numbers.isLoading ? (
                <tr>
                  <td className="px-4 py-3" colSpan={6}>
                    <Skeleton className="h-6 w-full" />
                  </td>
                </tr>
              ) : numbers.data?.items?.length ? (
                numbers.data.items.map((n) => {
                  const created = format(new Date(n.createdAt), 'yyyy-MM-dd HH:mm')
                  return (
                    <tr key={n.id} className="border-b last:border-0">
                      <td className="px-4 py-2 font-medium">{n.e164}</td>
                      <td className="px-4 py-2">
                        {n.active ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="default">Inactive</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <select
                          className="h-9 min-w-[220px] rounded-md border border-gray-300 bg-white px-2 text-sm"
                          disabled={propsQuery.isLoading || assign.isPending}
                          value={n.property?.id ?? ''}
                          onChange={(e) => {
                            const propertyId = e.target.value || null
                            assign.mutate({
                              numberId: n.id,
                              propertyId,
                              exclusive: true,
                              activate: true,
                            })
                          }}
                        >
                          <option value="">— Unassigned —</option>
                          {properties.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2 text-gray-600">{n.twilioSid}</td>
                      <td className="px-4 py-2">{created}</td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-2">
                          {!n.active ? (
                            <Button
                              size="sm"
                              onClick={() => activate.mutate({ numberId: n.id, exclusive: true })}
                              disabled={activate.isPending}
                            >
                              {activate.isPending ? 'Activating…' : 'Activate'}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deactivate.mutate({ numberId: n.id })}
                              disabled={deactivate.isPending}
                            >
                              {deactivate.isPending ? 'Updating…' : 'Deactivate'}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              confirm(`Release ${n.e164} in Twilio? This is permanent.`) &&
                              release.mutate({ numberId: n.id })
                            }
                            disabled={release.isPending}
                          >
                            {release.isPending ? 'Releasing…' : 'Release'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>
                    No numbers yet. Provision one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}
