'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { TicketPriority, TicketStatus } from '@/types'
import { useUpdateTicket } from '@/hooks/useTickets'
import { Button } from '@/components/ui/button'

interface Props {
  ticketId: string
  initialStatus: TicketStatus
  initialPriority: TicketPriority
  onSaved?: () => void
}

export default function UpdatePanel({
  ticketId,
  initialStatus,
  initialPriority,
  onSaved
}: Props) {
  const [status, setStatus] = useState<TicketStatus>(initialStatus)
  const [priority, setPriority] = useState<TicketPriority>(initialPriority)

  const update = useUpdateTicket()

  const save = () =>
    toast.promise(
      new Promise((resolve, reject) =>
        update.mutate(
          { id: ticketId, status, priority },
          {
            onSuccess: (data) => {
              onSaved?.()
              resolve(data)
            },
            onError: reject
          }
        )
      ),
      {
        loading: 'Saving…',
        success: 'Ticket updated',
        error: (err) =>
          (err as any)?.message ?? 'Failed to update ticket'
      }
    )

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Update Ticket</h2>

      <div className="flex flex-wrap items-center gap-4">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as TicketStatus)}
          className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm"
        >
          {['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as TicketPriority)}
          className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm"
        >
          {['EMERGENCY', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>

        <Button onClick={save} disabled={update.isPending}>
          {update.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
