'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useTickets } from '@/hooks/useTickets'
import { useProperties } from '@/hooks/useProperties'
import { useOrgNumbers } from '@/hooks/useOrgNumbers'
import { useInvites } from '@/hooks/useInvites'
import { useSession } from 'next-auth/react'
import { useAccessRequests, type AccessRequest } from '@/hooks/useAccessRequests'
import {
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle,
  Building2,
  Phone,
  Users,
  MailPlus,
  AlertCircle,
} from 'lucide-react'
import type { TicketWithRelations, TicketStatus } from '@/types'

export default function DashboardPage() {
  const { data: session } = useSession()
  const orgId = (session?.user as any)?.orgId as string | undefined

  // Data
  const ticketsQ = useTickets({ page: 1, pageSize: 200 })
  const propsQ   = useProperties({ page: 1, pageSize: 500 })
  const numbersQ = useOrgNumbers(orgId)
  const invites  = useInvites(orgId)
  const access   = useAccessRequests(orgId)

  const tickets: TicketWithRelations[] = ticketsQ.data?.items ?? []
  const properties = propsQ.data?.items ?? []
  const numbers = numbersQ.data?.items ?? []

  // KPIs
  const kpi = useMemo(() => {
    const open = tickets.filter((t) => t.status === 'OPEN').length
    const inProgress = tickets.filter((t) => t.status === 'IN_PROGRESS').length
    const emergency = tickets.filter((t) => t.priority === 'EMERGENCY').length
    return { total: tickets.length, open, inProgress, emergency }
  }, [tickets])

  // Backlog by property (OPEN + IN_PROGRESS)
  const backlogByProperty = useMemo(() => {
    const activeStatuses: TicketStatus[] = ['OPEN', 'IN_PROGRESS']
    const map = new Map<string, number>()
    for (const t of tickets) {
      if (!activeStatuses.includes(t.status)) continue
      map.set(t.propertyId, (map.get(t.propertyId) ?? 0) + 1)
    }
    const rows = properties
      .map((p) => ({ name: p.name, id: p.id, count: map.get(p.id) ?? 0 }))
      .sort((a, b) => b.count - a.count)
    return rows.slice(0, 6)
  }, [tickets, properties])

  // Aging tickets (active sorted by oldest createdAt)
  const aging = useMemo(() => {
    const active = tickets.filter(
      (t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS'
    )
    return active
      .slice()
      .sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      .slice(0, 6)
  }, [tickets])

  // Numbers coverage
  const activeNumbers = numbers.filter((n) => n.active)
  const assignedActive = activeNumbers.filter((n) => !!n.propertyId).length
  const coverage =
    properties.length > 0
      ? Math.round((assignedActive / properties.length) * 100)
      : 0

  const pendingInvites = invites.list.data?.items.length ?? 0
  const pendingAccess = access.list.data?.items.length ?? 0

  const loading =
    ticketsQ.isLoading || propsQ.isLoading || numbersQ.isLoading

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Organisation Overview</h1>
              <p className="mt-1 text-sm text-gray-500">
                Snapshot of workload, routing, and team activity
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => {
                  ticketsQ.refetch()
                  propsQ.refetch()
                  numbersQ.refetch()
                  invites.list.refetch()
                  access.list.refetch()
                }}
                disabled={loading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Link href="/dashboard/tickets">
                <Button variant="outline">Go to Tickets</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <section className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* KPI row */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <KpiCard label="Total Tickets" value={kpi.total} icon={<Clock className="h-5 w-5 text-blue-600" />} />
          <KpiCard label="Open" value={kpi.open} icon={<AlertTriangle className="h-5 w-5 text-yellow-600" />} />
          <KpiCard label="Emergency" value={kpi.emergency} icon={<AlertCircle className="h-5 w-5 text-red-600" />} />
          <KpiCard label="In Progress" value={kpi.inProgress} icon={<CheckCircle className="h-5 w-5 text-green-600" />} />
        </div>

        {/* Middle: Backlog + Aging */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Backlog by Property</h3>
            </div>
            {propsQ.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : backlogByProperty.length ? (
              <ul className="space-y-3">
                {backlogByProperty.map((row) => (
                  <li key={row.id} className="rounded border p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{row.name}</span>
                      <span className="text-sm text-gray-600">{row.count} active</span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-blue-600"
                        style={{ width: `${Math.min(100, (row.count / Math.max(1, backlogByProperty[0].count)) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty text="No active tickets across properties." />
            )}
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Oldest Active Tickets</h3>
            </div>
            {ticketsQ.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : aging.length ? (
              <ul className="divide-y">
                {aging.map((t) => {
                  const days = Math.max(0, Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 86400000))
                  return (
                    <li key={t.id} className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 pr-4">
                          <p className="truncate font-medium text-gray-900">{t.property?.name ?? '—'}</p>
                          <p className="truncate text-sm text-gray-600">{t.description || '(no description)'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">{t.status.replace('_', ' ')}</p>
                          <p className="text-sm font-semibold">{days}d old</p>
                        </div>
                      </div>
                      <div className="mt-2 text-right">
                        <Link href={`/dashboard/tickets/${t.id}`} className="text-sm text-blue-600 hover:underline">Open</Link>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <Empty text="No aging OPEN / IN_PROGRESS tickets." />
            )}
          </Card>
        </div>

        {/* Numbers coverage + Team snapshot */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Phone className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Numbers Coverage</h3>
            </div>
            {numbersQ.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <StatBox label="Active numbers" value={activeNumbers.length} />
                  <StatBox label="Assigned to property" value={assignedActive} />
                  <StatBox label="Properties" value={properties.length} />
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-600">Property coverage</p>
                  <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
                    <div className="h-2 rounded-full bg-green-600" style={{ width: `${coverage}%` }} />
                  </div>
                  <p className="mt-2 text-sm text-gray-700">{coverage}% of properties have an active number attached.</p>
                </div>
                <div className="mt-4">
                  <Link href="/dashboard/settings#numbers" className="text-sm text-blue-600 hover:underline">
                    Manage numbers
                  </Link>
                </div>
              </>
            )}
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Team & Requests</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <StatBox label="Pending invites" value={pendingInvites} />
              <StatBox label="Access requests" value={pendingAccess} />
            </div>

            {/* Access requests mini moderation list */}
            <div className="mt-4">
              <h4 className="mb-2 text-sm font-medium text-gray-900">Pending access</h4>
              {access.list.isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : (access.list.data?.items.length ?? 0) > 0 ? (
                <ul className="space-y-2">
                  {access.list.data!.items.slice(0, 5).map((r: AccessRequest) => (
                    <li key={r.id} className="flex items-center justify-between rounded border p-2">
                      <div className="min-w-0 pr-3">
                        <p className="truncate text-sm font-medium text-gray-900">{r.email}</p>
                        {r.message && <p className="truncate text-xs text-gray-600">{r.message}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => access.deny.mutate({ requestId: r.id })}
                        >
                          Dismiss
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => access.approve.mutate({ requestId: r.id, role: 'STAFF' })}
                        >
                          Invite
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty text="No pending access requests." />
              )}
            </div>

            <div className="mt-4">
              <Link href="/dashboard/settings#team" className="text-sm text-blue-600 hover:underline">
                Manage team & invites
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </div>
  )
}

/* --- tiny helpers/components --- */

function KpiCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="rounded-full bg-gray-100 p-3">{icon}</div>
      </div>
    </Card>
  )
}

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded border p-3 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="rounded border bg-white p-4 text-sm text-gray-500">{text}</p>
}
