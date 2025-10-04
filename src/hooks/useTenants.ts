'use client'

import { useQuery, QueryKey } from '@tanstack/react-query'
import type { Tenant, Property } from '@prisma/client'

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type TenantWithProperty = Tenant & { property: Property }

export interface ListParams {
  q?: string
  propertyId?: string
  page?: number
  pageSize?: number
}

export interface ListResponse {
  total: number
  items: TenantWithProperty[]
  page: number
  pageSize: number
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function buildQueryKey(params: ListParams): QueryKey {
  return ['tenants', params] as const
}

function buildUrl(params: ListParams): string {
  const url = new URL('/api/tenants', window.location.origin)
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.append(k, String(v))
    }
  })
  return url.toString()
}

async function jsonFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) }
  })
  if (!res.ok) throw new Error((await res.text()) || res.statusText)
  return res.json() as Promise<T>
}

/* -------------------------------------------------------------------------- */
/*  Hook                                                                       */
/* -------------------------------------------------------------------------- */

export function useTenants(params: ListParams) {
  return useQuery<ListResponse, Error>({
    queryKey: ['tenants', params],
    queryFn: () => jsonFetch<ListResponse>(buildUrl(params)),
    staleTime: 10_000,
    retry: (count, err) => {
      // Don’t retry client errors
      return !/400/.test(err.message) && count < 3
    },
  })
}
