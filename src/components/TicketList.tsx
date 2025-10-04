'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TicketCard } from '@/components/TicketCard'
import { PriorityBadge } from '@/components/PriorityBadge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCompleteTicket, useDeleteTicket } from '@/hooks/useTickets'
import { TicketWithRelations, TicketPriority } from '@/types'
import { AlertCircle, ChevronDown, ChevronUp, Check, Trash } from 'lucide-react'

interface Props {
  tickets: TicketWithRelations[]
  loading: boolean
  onTicketUpdate: () => void
}

const priorityRank: Record<TicketPriority, number> = {
  EMERGENCY: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1
} as const

export function TicketList({ tickets, loading, onTicketUpdate }: Props) {
  const [sortBy, setSortBy] = useState<'createdAt' | 'priority' | 'status'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showCompleted, setShowCompleted] = useState(false)

  const complete = useCompleteTicket()
  const remove   = useDeleteTicket()
  const router   = useRouter()

  if (loading) {
    return (
      <div className="grid gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  if (!tickets.length) {
    return (
      <Card className="p-8 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto" />
        <h3 className="text-lg font-medium text-gray-900">No tickets</h3>
        <Button variant="outline" onClick={onTicketUpdate}>Refresh</Button>
      </Card>
    )
  }

  const sorted = [...tickets].sort((a, b) => {
    let diff = 0
    switch (sortBy) {
      case 'createdAt':
        diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
      case 'priority':
        diff = priorityRank[a.priority] - priorityRank[b.priority]
        break
      case 'status':
        diff = a.status.localeCompare(b.status)
        break
    }
    return sortOrder === 'asc' ? diff : -diff
  })

  const visible = showCompleted ? sorted : sorted.filter((t) => t.status !== 'COMPLETED')

  const toggleSort = (field: typeof sortBy) => {
    setSortBy(field)
    setSortOrder((prev) => (sortBy === field ? (prev === 'asc' ? 'desc' : 'asc') : 'desc'))
  }

  const SortBtn = ({ field, label }: { field: typeof sortBy; label: string }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1"
    >
      {label}
      {sortBy === field &&
        (sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
    </Button>
  )

  const controls = (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Sort by:</span>
          <SortBtn field="createdAt" label="Date" />
          <SortBtn field="priority" label="Priority" />
          <SortBtn field="status" label="Status" />
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="rounded border-gray-300"
            />
            Show completed
          </label>
          <span className="text-sm text-gray-500">
            {visible.length} of {tickets.length} tickets
          </span>
        </div>
      </div>
    </Card>
  )

  // Mobile grid — click navigates to detail
  const cardGrid = (
    <div className="grid gap-4 md:hidden">
      {visible.map((t) => (
        <div key={t.id} className="relative">
          <TicketCard ticket={t} onClick={() => router.push(`/dashboard/tickets/${t.id}`)} />
          <div className="absolute right-3 top-3 flex gap-2">
            {t.status !== 'COMPLETED' && (
              <button
                title="Mark complete"
                disabled={complete.isPending}
                onClick={() => complete.mutate(t.id, { onSuccess: onTicketUpdate })}
              >
                <Check className="h-4 w-4 text-green-600" />
              </button>
            )}
            <button
              title="Delete"
              disabled={remove.isPending}
              onClick={() => remove.mutate(t.id, { onSuccess: onTicketUpdate })}
            >
              <Trash className="h-4 w-4 text-red-600" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )

  // Desktop table — ID is a link, actions disabled while pending
  const table = (
    <Card className="hidden md:block">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left">
          <tr className="border-b">
            <th className="px-4 py-3">ID</th>
            <th className="px-4 py-3">Property</th>
            <th className="px-4 py-3"><SortBtn field="priority" label="Priority" /></th>
            <th className="px-4 py-3"><SortBtn field="status" label="Status" /></th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3 w-20">Actions</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((t) => (
            <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
              <td className="px-4 py-2">
                <Link href={`/dashboard/tickets/${t.id}`} className="text-blue-600 hover:underline">
                  #{t.id.slice(-6)}
                </Link>
              </td>
              <td className="px-4 py-2">{t.property?.name}</td>
              <td className="px-4 py-2"><PriorityBadge priority={t.priority} /></td>
              <td className="px-4 py-2">{t.status}</td>
              <td className="px-4 py-2">{new Date(t.createdAt).toLocaleDateString()}</td>
              <td className="px-4 py-2">
                <div className="flex gap-2">
                  {t.status !== 'COMPLETED' && (
                    <button
                      title="Complete"
                      disabled={complete.isPending}
                      onClick={() => complete.mutate(t.id, { onSuccess: onTicketUpdate })}
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </button>
                  )}
                  <button
                    title="Delete"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(t.id, { onSuccess: onTicketUpdate })}
                    className="text-red-600"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )

  return (
    <div className="space-y-4">
      {controls}
      {cardGrid}
      {table}

      {visible.length === 0 && (
        <Card className="p-8 text-center">
          <AlertCircle className="mx-auto mb-2 h-8 w-8 text-gray-400" />
          <p className="text-gray-500">
            All tickets are completed. Check “Show completed” to display them.
          </p>
        </Card>
      )}
    </div>
  )
}
