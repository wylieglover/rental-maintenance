// src/app/api/invites/accept/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Accept both JSON and HTML form posts
  const ct = req.headers.get('content-type') || ''
  let token: string | null = null
  let next = '/dashboard'

  if (ct.includes('application/json')) {
    const body = await req.json().catch(() => null)
    token = body?.token ?? null
    next = body?.next ?? next
  } else {
    const form = await req.formData().catch(() => null)
    token = (form?.get('token') as string) || null
    next = (form?.get('next') as string) || next
  }

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const session = await auth()
  if (!session?.user?.email) {
    // If not signed in, bounce to sign-in and come back
    const signin = new URL('/signin', req.url)
    signin.searchParams.set('callbackUrl', `/invite/${token}`)
    return NextResponse.redirect(signin, { status: 302 })
  }

  const meEmail = session.user.email.toLowerCase()

  const invite = await prisma.orgInvite.findUnique({
    where: { token },
  })
  if (!invite) {
    return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 })
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Invitation expired' }, { status: 410 })
  }

  if (invite.acceptedAt) {
    // Idempotent: already accepted → just go where they were heading
    return NextResponse.redirect(new URL(next, req.url), { status: 302 })
  }

  if (invite.email.toLowerCase() !== meEmail) {
    return NextResponse.json({ error: 'Email mismatch' }, { status: 403 })
  }

  const userId = (session.user as any).id as string

  await prisma.$transaction(async (tx) => {
    // Ensure membership exists (idempotent)
    const existing = await tx.orgMembership.findFirst({
      where: {
        userId,
        organisationId: invite.organisationId,
      },
    })

    if (!existing) {
      await tx.orgMembership.create({
        data: {
          userId,
          organisationId: invite.organisationId,
          role: invite.role as any, // Role enum in your schema
        },
      })
    } else if (existing.role !== invite.role) {
      // Optional: upgrade/downgrade role to match invite
      await tx.orgMembership.update({
        where: { id: existing.id },
        data: { role: invite.role as any },
      })
    }

    // Mark invite accepted
    await tx.orgInvite.update({
      where: { id: invite.id },
      data: {
        acceptedAt: new Date(),
        acceptedByUserId: userId,
      },
    })
  })

  // The JWT session is refreshed on next request by your auth callback
  return NextResponse.redirect(new URL(next, req.url), { status: 302 })
}
