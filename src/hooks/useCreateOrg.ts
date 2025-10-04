'use client'

import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useSession } from 'next-auth/react'

type Payload = { name: string; slug: string }

export function useCreateOrg() {
  const { update } = useSession()
  return useMutation<
    { organisation: { id: string; name: string; slug: string } },
    Error,
    Payload
  >({
    mutationFn: async (body) => {
      const res = await fetch('/api/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: async () => {
      toast.success('Organisation created')
      // Force the session to refresh so orgId/orgSlugs update immediately
      await update()
    },
    onError: (e) => toast.error(e.message || 'Failed to create organisation'),
  })
}
