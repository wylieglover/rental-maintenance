import { NextRequest, NextResponse } from 'next/server'
import { requireSessionOrgRole } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Require a signed-in staffer/manager/owner to view proxied media
  try {
    await requireSessionOrgRole(['OWNER', 'MANAGER', 'STAFF'])
  } catch {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const u = req.nextUrl.searchParams.get('u')
  if (!u) return new NextResponse('Missing u', { status: 400 })

  const ACCT = process.env.TWILIO_ACCOUNT_SID!
  const AUTH = process.env.TWILIO_AUTH_TOKEN!
  if (!ACCT || !AUTH) return new NextResponse('Twilio not configured', { status: 503 })

  // Allow only Twilio media URLs for *this* account to avoid SSRF
  const ok = new RegExp(
    `^https://api\\.twilio\\.com/2010-04-01/Accounts/${ACCT}/Messages/[^/]+/Media/[^/]+$`
  ).test(u)
  if (!ok) return new NextResponse('Invalid URL', { status: 400 })

  const res = await fetch(u, {
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${ACCT}:${AUTH}`).toString('base64'),
    },
  })
  if (!res.ok) return new NextResponse('Fetch failed', { status: 502 })

  // Trust Twilio’s Content-Type; don’t accept it from the querystring
  const ct = res.headers.get('content-type') ?? 'application/octet-stream'
  return new NextResponse(res.body, {
    status: 200,
    headers: {
      'Content-Type': ct,
      'Cache-Control': 'private, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
