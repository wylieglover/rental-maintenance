// Image uploads to Vercel Blob (for UI-created tickets/comments)
import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { requireSessionOrgRole } from '@/lib/auth'
import { limit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB per file

export async function POST(req: NextRequest) {
  // Auth (staff or manager or owner in current org)
  try {
    await requireSessionOrgRole(['STAFF', 'MANAGER', 'OWNER'])
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // RL: 10 uploads / minute per IP
  const rl = await limit(req.headers.get('x-forwarded-for') ?? 'uploads', {
    window: 60,
    limit: 10,
  })
  if (!rl.success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })

  const files = form.getAll('files').filter(Boolean) as File[]
  if (files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 })
  }
  if (files.length > 5) {
    return NextResponse.json({ error: 'Max 5 files' }, { status: 400 })
  }

  const urls: string[] = []
  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only images allowed' }, { status: 400 })
    }
    const arrayBuffer = await file.arrayBuffer()
    if (arrayBuffer.byteLength > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Max 10MB per file' }, { status: 400 })
    }

    const buffer = Buffer.from(arrayBuffer)
    const filename = `tickets/ui-${Date.now()}-${cryptoRandom()}-${sanitize(file.name)}`
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: file.type,
    })
    urls.push(blob.url)
  }

  return NextResponse.json({ urls })
}

function cryptoRandom() {
  // tiny random suffix (avoid bringing in crypto for just this)
  return Math.random().toString(16).slice(2, 10)
}
function sanitize(name: string) {
  return name.replace(/[^\w.\-]+/g, '_')
}
