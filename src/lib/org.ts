// src/lib/org.ts
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000'

export async function getOrgFromHost(req: NextRequest) {
  const host = req.headers.get('host') ?? ''
  // Try an exact Domain.host match first (supports custom domains)
  const domain = await prisma.domain.findUnique({
    where: { host },
    include: { organisation: true },
  })
  if (domain) return { org: domain.organisation, host, subdomain: null as string | null }

  // Fallback: subdomain of the root (e.g., acme.myapp.com)
  if (host === ROOT_DOMAIN || host.startsWith('localhost')) {
    return { org: null, host, subdomain: null as string | null }
  }
  const sub = host.replace(`.${ROOT_DOMAIN}`, '')
  const org = await prisma.organisation.findUnique({ where: { slug: sub } })
  return { org, host, subdomain: org ? sub : null }
}

export async function requireOrgFromHost(req: NextRequest) {
  const { org } = await getOrgFromHost(req)
  if (!org) throw new Error('Organisation not found for host')
  return org
}
