// src/app/(auth)/signout/page.tsx
'use client'

import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function SignOutPage() {
  const { data: session } = useSession()
  const email = session?.user?.email

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-[320px] rounded-lg p-4 space-y-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <Image src="/logo.svg" alt="" width={24} height={24} />
          <h1 className="text-base font-semibold">Sign out</h1>
        </div>

        <p className="text-xs text-gray-600">
          {email ? <>You’re signed in as <span className="font-medium">{email}</span>.</> : 'You are currently signed in.'}
        </p>

        <div className="flex items-center justify-center gap-2 pt-1">
          <Button size="sm" variant="outline">
            <Link href="/dashboard">Cancel</Link>
          </Button>
          <Button size="sm" onClick={() => signOut({ callbackUrl: '/' })}>
            Sign out
          </Button>
        </div>
      </Card>
    </main>
  )
}
