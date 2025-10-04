import { TicketPriority } from '@/types'
import { Badge } from '@/components/ui/badge'

interface Props {
  priority: TicketPriority
  className?: string
}

const variantMap: Record<TicketPriority, Parameters<typeof Badge>[0]['variant']> =
  {
    EMERGENCY: 'error',
    HIGH: 'warning',
    MEDIUM: 'default',
    LOW: 'success'
  }

export function PriorityBadge({ priority, className }: Props) {
  const label = priority[0] + priority.slice(1).toLowerCase() // EMERGENCY → Emergency
  return (
    <Badge variant={variantMap[priority]} className={className}>
      {label}
    </Badge>
  )
}
