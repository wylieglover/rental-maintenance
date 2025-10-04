// src/app/api/orgs/[id]/access-requests/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrgRole } from '@/lib/auth'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// map many query variants -> your schema values (OPEN | INVITED | DISMISSED)
const STATUS_MAP: Record<string, 'OPEN' | 'INVITED' | 'DISMISSED'> = {
  pending: 'OPEN',
  open: 'OPEN',
  approved: 'INVITED',
  invited: 'INVITED',
  denied: 'DISMISSED',
  dismissed: 'DISMISSED',
}

const StatusParam = z
  .union([
    z.literal('all'),
    z.literal('pending'),
    z.literal('open'),
    z.literal('approved'),
    z.literal('invited'),
    z.literal('denied'),
    z.literal('dismissed'),
  ])
  .default('pending')

const CreateAccessRequestSchema = z.object({
  email: z.string().email(),
  message: z.string().optional(),
})

const PatchSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('approve'),
    requestId: z.string().min(1),
    role: z.enum(['MANAGER', 'STAFF']).default('STAFF'),
    expiresInDays: z.number().int().min(1).max(90).default(7),
  }),
  z.object({
    action: z.literal('deny'),
    requestId: z.string().min(1),
  }),
])

// Helper function to resolve org by slug or ID
async function resolveOrganisation(identifier: string) {
  // First try to find by slug
  let org = await prisma.organisation.findUnique({
    where: { slug: identifier },
    select: { id: true, slug: true, name: true }
  })
  
  // If not found by slug, try by ID
  if (!org) {
    org = await prisma.organisation.findUnique({
      where: { id: identifier },
      select: { id: true, slug: true, name: true }
    })
  }
  
  return org
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orgIdentifier } = await params
  
  // Resolve organization by slug or ID
  const org = await resolveOrganisation(orgIdentifier)
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }
  
  await requireOrgRole(org.id, ['OWNER', 'MANAGER'])

  const sp = new URL(req.url).searchParams
  const statusStr = (sp.get('status') ?? 'pending').toLowerCase()
  const parsed = StatusParam.safeParse(statusStr)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const chosen = parsed.data
  const where =
    chosen === 'all'
      ? { organisationId: org.id }
      : { organisationId: org.id, status: STATUS_MAP[chosen] }

  const items = await prisma.orgAccessRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      message: true,
      status: true,       // OPEN | INVITED | DISMISSED
      createdAt: true,
      handledAt: true,
      handledById: true,
      inviteId: true,
    },
  })

  return NextResponse.json({ items })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orgIdentifier } = await params
  
  // Resolve organization by slug or ID
  const org = await resolveOrganisation(orgIdentifier)
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => null)
  const parsed = CreateAccessRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { email, message } = parsed.data

  // Check if there's already a pending request for this email/org
  const existingRequest = await prisma.orgAccessRequest.findFirst({
    where: {
      organisationId: org.id,
      email: email.toLowerCase(),
      status: 'OPEN'
    }
  })

  if (existingRequest) {
    return NextResponse.json({ 
      error: 'An access request for this email already exists and is pending' 
    }, { status: 409 })
  }

  // Create the access request
  const accessRequest = await prisma.orgAccessRequest.create({
    data: {
      organisationId: org.id,
      email: email.toLowerCase(),
      message: message || null,
      status: 'OPEN'
    },
    select: {
      id: true,
      email: true,
      message: true,
      status: true,
      createdAt: true,
    }
  })

  return NextResponse.json({ 
    ok: true, 
    accessRequest,
    organisation: {
      id: org.id,
      slug: org.slug,
      name: org.name
    }
  }, { status: 201 })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orgIdentifier } = await params
  
  // Resolve organization by slug or ID
  const org = await resolveOrganisation(orgIdentifier)
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }
  
  const { userId } = await requireOrgRole(org.id, ['OWNER', 'MANAGER'])

  const body = await req.json().catch(() => null)
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const data = parsed.data

  const ar = await prisma.orgAccessRequest.findFirst({
    where: { id: data.requestId, organisationId: org.id },
  })
  if (!ar) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (ar.status !== 'OPEN') {
    return NextResponse.json({ error: 'Request is not OPEN' }, { status: 409 })
  }

  // Deny (DISMISSED)
  if (data.action === 'deny') {
    await prisma.orgAccessRequest.update({
      where: { id: ar.id },
      data: { status: 'DISMISSED', handledById: userId, handledAt: new Date() },
    })
    return NextResponse.json({ ok: true })
  }

  // Approve → create invite + mark request INVITED
  const expiresAt = new Date(Date.now() + (data.expiresInDays ?? 7) * 24 * 60 * 60 * 1000)
  const token = crypto.randomUUID().replace(/-/g, '')

  const result = await prisma.$transaction(async (tx) => {
    const invite = await tx.orgInvite.create({
      data: {
        organisationId: org.id,
        email: ar.email.toLowerCase(),
        role: data.role,
        token,
        expiresAt,
        invitedByUserId: userId,
      },
      select: { id: true, token: true, email: true, role: true, expiresAt: true },
    })

    await tx.orgAccessRequest.update({
      where: { id: ar.id },
      data: {
        status: 'INVITED',
        handledById: userId,
        handledAt: new Date(),
        inviteId: invite.id, // loose reference; not a relation
      },
    })

    return invite
  })

  return NextResponse.json({ ok: true, invite: result })
}