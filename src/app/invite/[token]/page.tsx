// src/app/invite/[token]/page.tsx
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const invite = await prisma.orgInvite.findUnique({
    where: { token },
    include: { organisation: { select: { id: true, name: true } } },
  })
  if (!invite) notFound()

  // If already accepted, send them to the dashboard
  if (invite.acceptedAt) redirect('/dashboard')

  const expired = invite.expiresAt < new Date()

  const session = await auth()
  const meEmail = session?.user?.email?.toLowerCase() ?? null
  const invitedEmail = invite.email.toLowerCase()

  return (
    <main className="mx-auto max-w-md p-6">
      <div className="space-y-4 rounded-md border bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold">Join {invite.organisation.name}</h1>

        <p className="text-sm text-gray-600">
          You were invited as <b>{invite.role}</b> for <b>{invite.organisation.name}</b>.
        </p>
        <p className="text-sm">
          Invitation email: <b>{invitedEmail}</b>
        </p>

        {expired && (
          <div className="rounded bg-red-50 p-3 text-sm text-red-700">
            This invitation has expired.
          </div>
        )}

        {!session?.user && !expired && (
          <a
            href={`/signin?callbackUrl=/invite/${token}`}
            className="inline-flex items-center rounded bg-blue-600 px-4 py-2 text-white"
          >
            Continue with Google
          </a>
        )}

        {session?.user && !expired && (
          <>
            {meEmail !== invitedEmail ? (
              <div className="space-y-3">
                <div className="rounded bg-yellow-50 p-3 text-sm text-yellow-800">
                  You are signed in as <b>{meEmail}</b>, but this invite is for{' '}
                  <b>{invitedEmail}</b>.
                </div>
                <div className="flex gap-2">
                  <a className="rounded border px-3 py-2 text-sm" href="/api/auth/signout">
                    Sign out
                  </a>
                </div>
              </div>
            ) : (
              <form action="/api/invites/accept" method="post">
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="next" value="/dashboard" />
                <button className="rounded bg-blue-600 px-4 py-2 text-white">
                  Accept invitation
                </button>
              </form>
            )}
          </>
        )}

        <div className="pt-2 text-xs text-gray-500">
          Problems? <Link className="underline" href="/support">Contact support</Link>.
        </div>
      </div>
    </main>
  )
}
