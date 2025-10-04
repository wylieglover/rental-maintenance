// src/hooks/useAccessRequests.ts
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

export type AccessRequestStatus = 'PENDING' | 'APPROVED' | 'DENIED'

export interface AccessRequest {
  id: string
  email: string
  name: string | null
  message: string | null
  status: AccessRequestStatus
  createdAt: string
}

export interface AccessRequestListResponse {
  items: AccessRequest[]
}

type ApprovePayload = {
  requestId: string
  role: 'MANAGER' | 'STAFF'
  expiresInDays?: number
}

type DenyPayload = { requestId: string }

async function jsonFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) throw new Error((await res.text()) || res.statusText)
  return res.json() as Promise<T>
}

export function useAccessRequests(orgId?: string) {
  const qc = useQueryClient()

  const list = useQuery<AccessRequestListResponse, Error>({
    queryKey: ['access-requests', orgId],
    queryFn: () =>
      jsonFetch<AccessRequestListResponse>(
        `/api/orgs/${orgId}/access-requests?status=pending`
      ),
    enabled: !!orgId,
    staleTime: 10_000,
  })

  const approve = useMutation<{ ok: true }, Error, ApprovePayload>({
    mutationFn: (payload) =>
      jsonFetch<{ ok: true }>(`/api/orgs/${orgId}/access-requests`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'approve', ...payload }),
      }),
    onSuccess: () => {
      toast.success('Approved & invite sent')
      qc.invalidateQueries({ queryKey: ['access-requests', orgId] })
      qc.invalidateQueries({ queryKey: ['invites', orgId] }) // shows up in Invites card
    },
    onError: (e) => toast.error(e.message || 'Failed to approve'),
  })

  const deny = useMutation<{ ok: true }, Error, DenyPayload>({
    mutationFn: (payload) =>
      jsonFetch<{ ok: true }>(`/api/orgs/${orgId}/access-requests`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'deny', ...payload }),
      }),
    onSuccess: () => {
      toast.success('Request denied')
      qc.invalidateQueries({ queryKey: ['access-requests', orgId] })
    },
    onError: (e) => toast.error(e.message || 'Failed to deny'),
  })

  return { list, approve, deny }
}
