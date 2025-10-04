'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import type { Tenant } from '@prisma/client'

type CreateTenantDto = {
  propertyId: string
  phoneNumber: string
  name?: string
  unitNumber?: string
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

export function useCreateTenant() {
  const qc = useQueryClient()
  return useMutation<Tenant, Error, CreateTenantDto>({
    mutationFn: (dto) =>
      jsonFetch<Tenant>('/api/tenants', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenants'] })
      qc.invalidateQueries({ queryKey: ['properties'] })
    },
    onError: (e) => toast.error(e.message || 'Failed to create tenant'),
  })
}
