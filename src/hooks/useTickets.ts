'use client'

import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryKey
} from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Ticket,
  TicketStatus,
  TicketPriority,
  TicketCategory
} from '@prisma/client'
import type { TicketWithRelations } from '@/types'

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface ListParams {
  status?: TicketStatus
  priority?: TicketPriority
  category?: TicketCategory
  propertyId?: string
  page?: number
  pageSize?: number
}

export interface ListResponse {
  total: number
  items: TicketWithRelations[]
  page: number
  pageSize: number
}

export interface CreateTicketDto {
  description?: string
  category?: TicketCategory
  priority?: TicketPriority
  imageUrls?: string[]
  tenantId: string
  propertyId: string
}

export interface UpdateTicketDto {
  id: string
  status?: TicketStatus
  priority?: TicketPriority
  description?: string
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function buildQueryKey(params: ListParams): QueryKey {
  return ['tickets', params] as const
}

function buildUrl(params: ListParams): string {
  const url = new URL('/api/tickets', window.location.origin)
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '')
      url.searchParams.append(k, String(v))
  })
  return url.toString()
}

async function jsonFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!res.ok) {
    const msg = await res.text().catch(() => '')
    throw new Error(msg || res.statusText)
  }

  if (res.status === 204) {
    return undefined as unknown as T
  }

  const text = await res.text()
  if (!text) return undefined as unknown as T
  try {
    return JSON.parse(text) as T
  } catch {
    return undefined as unknown as T
  }
}

/* -------------------------------------------------------------------------- */
/*  Public hooks                                                              */
/* -------------------------------------------------------------------------- */

export function useTickets(params: ListParams) {
  return useQuery<ListResponse, Error, ListResponse>({
    queryKey: buildQueryKey(params),
    queryFn: () => jsonFetch<ListResponse>(buildUrl(params))
  })
}

export function useCreateTicket() {
  const qc = useQueryClient()

  return useMutation<Ticket, Error, CreateTicketDto>({
    mutationFn: (dto) =>
      jsonFetch<Ticket>('/api/tickets', {
        method: 'POST',
        body: JSON.stringify(dto)
      }),

    onSuccess: () => {
      toast.success('Ticket created')
      qc.invalidateQueries({ queryKey: ['tickets'] })
    },

    onError: (err) => toast.error(err.message ?? 'Failed to create ticket')
  })
}

export function useUpdateTicket() {
  const qc = useQueryClient()

  return useMutation<Ticket, Error, UpdateTicketDto>({
    mutationFn: ({ id, ...dto }) =>
      jsonFetch<Ticket>(`/api/tickets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dto)
      }),

    onSuccess: (_, { id }) => {
      toast.success('Ticket updated')
      qc.invalidateQueries({ queryKey: ['tickets'] })
      qc.invalidateQueries({ queryKey: ['ticket', id] })
    },

    onError: (err) => toast.error(err.message ?? 'Failed to update ticket')
  })
}

export function useCompleteTicket() {
  const qc = useQueryClient()
  return useMutation<Ticket, Error, string>({
    mutationFn: (id) =>
      jsonFetch<Ticket>(`/api/tickets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'COMPLETED' })
      }),
    onSuccess: () => {
      toast.success('Ticket marked completed')
      qc.invalidateQueries({ queryKey: ['tickets'] })
    },
    onError: (err) => toast.error(err.message)
  })
}

export function useDeleteTicket() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => jsonFetch<void>(`/api/tickets/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Ticket deleted')
      qc.invalidateQueries({ queryKey: ['tickets'] })
    },
    onError: (err) => toast.error(err.message)
  })
}
