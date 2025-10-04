// src/components/TeamInvitesCard.tsx
'use client'

import { useMemo, useState } from 'react'
import { addDays, format } from 'date-fns'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import toast from 'react-hot-toast'
import { useInvites, type InviteRole } from '@/hooks/useInvites'

type Props = {
  orgId?: string
  /** Absolute origin to build copy links (e.g. https://app.example.com) */
  baseUrl: string
}

export default function TeamInvitesCard({ orgId, baseUrl }: Props) {
  const invites = useInvites(orgId)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<InviteRole>('MANAGER')
  const [inviteDays, setInviteDays] = useState<number>(7)

  const pendingInvites = useMemo(() => invites.list.data?.items ?? [], [invites.list.data])

  const canSend =
    !!inviteEmail.trim() && !!orgId && !invites.create.isPending && Number(inviteDays) >= 1

  const copyLink = (token: string) => {
    const url = `${baseUrl}/invite/${token}`
    navigator.clipboard.writeText(url).then(
      () => toast.success('Invite link copied'),
      () => toast.error('Could not copy link')
    )
  }

  const quickPick = (d: number) => setInviteDays(d)

  const expiresOn = format(addDays(new Date(), Math.max(1, Number(inviteDays) || 1)), 'yyyy-MM-dd')

  return (
    <Card className="space-y-4 p-6">
      <div>
        <h2 className="text-lg font-semibold">Team access</h2>
        <p className="text-sm text-gray-600">Invite managers or staff to this organisation.</p>
      </div>

      {/* Invite form */}
      <div className="grid gap-3 md:grid-cols-[1fr,160px,auto,140px]">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Email</label>
          <Input
            placeholder="person@company.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            aria-label="Invite email"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Role</label>
          <select
            className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as InviteRole)}
            aria-label="Invite role"
          >
            <option value="MANAGER">Manager</option>
            <option value="STAFF">Staff</option>
          </select>
        </div>

        {/* Clear expiry control */}
        <div className="flex items-center gap-2">
          <label htmlFor="invite-days" className="text-sm text-gray-700 whitespace-nowrap">
            Expires in
          </label>
          <Input
            id="invite-days"
            type="number"
            min={1}
            max={90}
            value={inviteDays}
            onChange={(e) => setInviteDays(Number(e.target.value || 1))}
            className="h-9 w-20"
            aria-label="Expiry in days"
          />
          <span className="text-sm text-gray-700">days</span>
        </div>

        <div className="self-end">
          <Button
            className="w-full"
            onClick={() =>
              invites.create.mutate(
                { email: inviteEmail.trim(), role: inviteRole, expiresInDays: inviteDays },
                {
                  onSuccess: () => {
                    toast.success('Invite sent')
                    setInviteEmail('')
                  },
                }
              )
            }
            disabled={!canSend}
          >
            {invites.create.isPending ? 'Sending…' : 'Send invite'}
          </Button>
        </div>
      </div>

      {/* Quick picks + preview */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          Quick picks:
          {[1, 3, 7, 14, 30].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => quickPick(d)}
              className={`rounded border px-2 py-1 ${
                inviteDays === d ? 'border-blue-500 text-blue-600' : 'border-gray-300'
              }`}
              aria-label={`Set invite to expire in ${d} days`}
            >
              {d}d
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500">Will expire on {expiresOn}</span>
      </div>

      {/* Invite list */}
      <div className="overflow-x-auto">
        <table className="mt-2 w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr className="border-b">
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3 w-64">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invites.list.isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-3">
                  <Skeleton className="h-6 w-full" />
                </td>
              </tr>
            ) : pendingInvites.length ? (
              pendingInvites.map((inv) => {
                const expired = new Date(inv.expiresAt).getTime() < Date.now()
                return (
                  <tr key={inv.id} className="border-b last:border-0">
                    <td className="px-4 py-2">{inv.email}</td>
                    <td className="px-4 py-2">{inv.role}</td>
                    <td className="px-4 py-2">
                      {inv.acceptedAt ? (
                        <Badge variant="success">Accepted</Badge>
                      ) : expired ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : (
                        <Badge variant="default">Pending</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2">{format(new Date(inv.expiresAt), 'yyyy-MM-dd')}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyLink(inv.token)}
                          disabled={!!inv.acceptedAt}
                        >
                          Copy link
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => invites.revoke.mutate({ inviteId: inv.id })}
                          disabled={invites.revoke.isPending}
                        >
                          Revoke
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  No open invites.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
