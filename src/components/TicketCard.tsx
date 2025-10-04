// src/components/TicketCard.tsx
'use client'

import { TicketWithRelations } from '@/types'   // ← swap import
import { Card } from '@/components/ui/card'
import { PriorityBadge } from '@/components/PriorityBadge'
import { formatDistanceToNow } from 'date-fns'

interface Props {
  ticket: TicketWithRelations          // ← update type
  onClick?: () => void
  showProperty?: boolean
}

export function TicketCard({ ticket, onClick, showProperty }: Props) {
  const createdAgo = formatDistanceToNow(new Date(ticket.createdAt), {
    addSuffix: true,
  })

  return (
    <Card
      className="cursor-pointer transition hover:shadow-md"
      onClick={onClick}
    >
      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">#{ticket.id.slice(-6)}</h3>
          <PriorityBadge priority={ticket.priority} />
        </div>

        {ticket.description && (
          <p className="line-clamp-2 text-sm text-gray-700">
            {ticket.description}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500">
          {showProperty && (
            <span>{ticket.property?.name ?? ticket.propertyId}</span>
          )}
          <span>{createdAgo}</span>
        </div>
      </div>
    </Card>
  )
}
