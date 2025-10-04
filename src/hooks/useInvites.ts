'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

export type InviteRole = 'MANAGER' | 'STAFF'

export interface Invite {
  id: string
  email: string
  role: InviteRole
  token: string               // used to build /join?token=… links
  createdAt: string
  expiresAt: string
  acceptedAt: string | null
}

export interface InviteListResponse {
  items: Invite[]
}

export interface CreateInviteDto {
  email: string
  role: InviteRole
  expiresInDays?: number
}

async function jsonFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) throw new Error((await res.text()) || res.statusText)
  return res.json() as Promise<T>
}

export function useInvites(orgId?: string) {
  const qc = useQueryClient()

  const list = useQuery<InviteListResponse, Error>({
    queryKey: ['invites', orgId],
    queryFn: () => jsonFetch<InviteListResponse>(`/api/orgs/${orgId}/invites`),
    enabled: !!orgId,
    staleTime: 10_000,
  })

  const create = useMutation<Invite, Error, CreateInviteDto>({
    mutationFn: (dto) =>
      jsonFetch<Invite>(`/api/orgs/${orgId}/invites`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      toast.success('Invite sent')
      qc.invalidateQueries({ queryKey: ['invites', orgId] })
    },
    onError: (err) => toast.error(err.message || 'Failed to send invite'),
  })

  const revoke = useMutation<{ ok: true }, Error, { inviteId: string }>({
    mutationFn: ({ inviteId }) =>
      jsonFetch<{ ok: true }>(`/api/orgs/${orgId}/invites/${inviteId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast.success('Invite revoked')
      qc.invalidateQueries({ queryKey: ['invites', orgId] })
    },
    onError: (err) => toast.error(err.message || 'Failed to revoke invite'),
  })

  return { list, create, revoke }
}
