'use client'

import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryKey,
} from '@tanstack/react-query'
import toast from 'react-hot-toast'
import type { OrgNumber } from '@prisma/client'

/* ----------------------------------------------------------------------------
 * Types
 * -------------------------------------------------------------------------- */

export type OrgNumberWithProperty = OrgNumber & {
  property?: { id: string; name: string } | null
}

export interface NumbersListResponse {
  items: OrgNumberWithProperty[]
}

export type ProvisionPayload =
  | { mode?: 'purchase'; type?: 'LOCAL' | 'TOLLFREE'; areaCode?: string }
  | { mode: 'attach'; phoneNumber: string }

/* ----------------------------------------------------------------------------
 * Helpers
 * -------------------------------------------------------------------------- */

function key(orgId: string): QueryKey {
  return ['orgNumbers', orgId] as const
}

async function jsonFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) throw new Error((await res.text()) || res.statusText)
  if (res.status === 204) return undefined as unknown as T
  return res.json() as Promise<T>
}

/* ----------------------------------------------------------------------------
 * Queries
 * -------------------------------------------------------------------------- */

export function useOrgNumbers(orgId: string | undefined) {
  return useQuery<NumbersListResponse, Error>({
    enabled: !!orgId,
    queryKey: orgId ? key(orgId) : ['orgNumbers-disabled'],
    queryFn: () => jsonFetch<NumbersListResponse>(`/api/orgs/${orgId}/twilio/numbers`),
    staleTime: 10_000
  })
}

/* ----------------------------------------------------------------------------
 * Mutations
 * -------------------------------------------------------------------------- */

export function useProvisionNumber(orgId: string | undefined) {
  const qc = useQueryClient()
  return useMutation<
    { success: true; number: OrgNumberWithProperty } | any,
    Error,
    ProvisionPayload | undefined
  >({
    mutationFn: (body) =>
      jsonFetch(`/api/orgs/${orgId}/twilio/provision`, {
        method: 'POST',
        body: JSON.stringify(body ?? {}),
      }),
    onSuccess: () => {
      toast.success('Number provisioned')
      if (orgId) qc.invalidateQueries({ queryKey: key(orgId) })
    },
    onError: (e) => toast.error(e.message || 'Provision failed'),
  })
}

/** Attach/detach a number to a property. */
export function useAssignNumber(orgId: string | undefined) {
  const qc = useQueryClient()
  return useMutation<
    { success: true; number: OrgNumberWithProperty },
    Error,
    { numberId: string; propertyId: string | null; exclusive?: boolean; activate?: boolean }
  >({
    mutationFn: ({ numberId, ...body }) =>
      jsonFetch(`/api/orgs/${orgId}/twilio/numbers/${numberId}/assign`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast.success('Number updated')
      if (orgId) qc.invalidateQueries({ queryKey: key(orgId) })
    },
    onError: (e) => toast.error(e.message || 'Update failed'),
  })
}

export function useActivateNumber(orgId: string | undefined) {
  const qc = useQueryClient()
  return useMutation<
    { success: true; number: OrgNumberWithProperty },
    Error,
    { numberId: string; exclusive?: boolean }
  >({
    mutationFn: ({ numberId, exclusive = true }) =>
      jsonFetch(`/api/orgs/${orgId}/twilio/numbers/${numberId}/activate?exclusive=${exclusive ? '1' : '0'}`, {
        method: 'POST',
      }),
    onSuccess: () => {
      toast.success('Number activated')
      if (orgId) qc.invalidateQueries({ queryKey: key(orgId) })
    },
    onError: (e) => toast.error(e.message || 'Activate failed'),
  })
}

export function useDeactivateNumber(orgId: string | undefined) {
  const qc = useQueryClient()
  return useMutation<void, Error, { numberId: string }>({
    mutationFn: ({ numberId }) =>
      jsonFetch(`/api/orgs/${orgId}/twilio/numbers/${numberId}`, {
        method: 'DELETE',
        body: JSON.stringify({ release: false }),
      }),
    onSuccess: () => {
      toast.success('Number deactivated')
      if (orgId) qc.invalidateQueries({ queryKey: key(orgId) })
    },
    onError: (e) => toast.error(e.message || 'Deactivate failed'),
  })
}

export function useReleaseNumber(orgId: string | undefined) {
  const qc = useQueryClient()
  return useMutation<void, Error, { numberId: string }>({
    mutationFn: ({ numberId }) =>
      jsonFetch(`/api/orgs/${orgId}/twilio/numbers/${numberId}`, {
        method: 'DELETE',
        body: JSON.stringify({ release: true }),
      }),
    onSuccess: () => {
      toast.success('Number released')
      if (orgId) qc.invalidateQueries({ queryKey: key(orgId) })
    },
    onError: (e) => toast.error(e.message || 'Release failed'),
  })
}
