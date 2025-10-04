'use client'

import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryKey
} from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Property } from '@prisma/client'

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface ListParams {
  search?: string
  page?: number
  pageSize?: number
}

export interface ListResponse {
  total: number
  items: Property[]
  page: number
  pageSize: number
}

export interface CreatePropertyDto {
  name: string
  address: string
  phoneNumber?: string   // ← optional now
  managerId?: string
}

export interface UpdatePropertyDto extends Partial<CreatePropertyDto> {
  id: string
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function buildQueryKey(params: ListParams): QueryKey {
  return ['properties', params] as const
}

function buildUrl(params: ListParams): string {
  const url = new URL('/api/properties', window.location.origin)
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
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) }
  })
  if (!res.ok) throw new Error((await res.text()) || res.statusText)
  return res.json() as Promise<T>
}

/* -------------------------------------------------------------------------- */
/*  Hooks                                                                     */
/* -------------------------------------------------------------------------- */

export function useProperties(
  params: { page: number; pageSize: number },
  opts?: { enabled?: boolean }
) {
  return useQuery<{ total: number; items: Property[] }, Error>({
    queryKey: ['properties', params] as const,
    queryFn: () => jsonFetch(buildUrl(params)),
    staleTime: 10_000,
    enabled: opts?.enabled ?? true,  
  });
}

export function useCreateProperty() {
  const qc = useQueryClient()
  return useMutation<Property, Error, CreatePropertyDto>({
    mutationFn: (dto) =>
      jsonFetch<Property>('/api/properties', {
        method: 'POST',
        body: JSON.stringify(dto)
      }),
    onSuccess: () => {
      toast.success('Property created')
      qc.invalidateQueries({ queryKey: ['properties'] })
    },
    onError: (err) => toast.error(err.message)
  })
}

export function useUpdateProperty() {
  const qc = useQueryClient()
  return useMutation<Property, Error, UpdatePropertyDto>({
    mutationFn: ({ id, ...dto }) =>
      jsonFetch<Property>(`/api/properties/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dto)
      }),
    onSuccess: () => {
      toast.success('Property updated')
      qc.invalidateQueries({ queryKey: ['properties'] })
    },
    onError: (err) => toast.error(err.message)
  })
}

export function useDeleteProperty() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) =>
      jsonFetch<void>(`/api/properties/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Property deleted')
      qc.invalidateQueries({ queryKey: ['properties'] })
    },
    onError: (err) => toast.error(err.message)
  })
}
