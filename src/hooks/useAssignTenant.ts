'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

type AssignPayload = {
  tenantId: string
  propertyId: string
  moveOpenTickets?: boolean
  notify?: boolean
  notifyMessage?: string
}

type AssignResult = { success: boolean; moved?: number; message?: string }

async function jsonFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) }
  })
  if (!res.ok) {
    // try to extract { error } JSON, else text
    const text = await res.text().catch(() => '')
    try {
      const j = JSON.parse(text) as { error?: string }
      throw new Error(j.error || res.statusText)
    } catch {
      throw new Error(text || res.statusText)
    }
  }
  if (res.status === 204) return undefined as unknown as T
  return res.json() as Promise<T>
}

export function useAssignTenant() {
  const qc = useQueryClient()
  return useMutation<AssignResult, Error, AssignPayload>({
    mutationFn: ({ tenantId, ...body }) =>
      jsonFetch<AssignResult>(`/api/tenants/${tenantId}/assign`, {
        method: 'POST',
        body: JSON.stringify(body)
      }),
    onSuccess: (result) => {
      const moved = result?.moved ?? 0
      toast.success(moved ? `Tenant assigned • moved ${moved} ticket(s)` : 'Tenant assigned')
      qc.invalidateQueries({ queryKey: ['tenants'] })
      qc.invalidateQueries({ queryKey: ['properties'] })
      qc.invalidateQueries({ queryKey: ['tickets'] })
    },
    onError: (e) => toast.error(e.message || 'Failed to assign tenant')
  })
}
