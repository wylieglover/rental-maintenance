import {
  Prisma,
  Ticket,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  Property,
  Tenant
} from '@prisma/client'

/* value exports */
export { TicketStatus, TicketPriority, TicketCategory }

/* relation helpers (compile-time only) */
export type TicketWithRelations = Prisma.TicketGetPayload<{
  include: { property: true; tenant: true }
}>

/* other type exports */
export type {
  Ticket,
  Property,
  Tenant,
  TicketStatus as TicketStatusType,
  TicketPriority as TicketPriorityType,
  TicketCategory as TicketCategoryType
}
