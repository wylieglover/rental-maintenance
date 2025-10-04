// POST → import tenants for a property from CSV/XLSX
// FormData: file=<File>, dryRun?=1
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSessionOrgRole } from '@/lib/auth'
import { normalizeUSPhone } from '@/lib/phone'
import { z } from 'zod'
import * as XLSX from 'xlsx'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RowSchema = z.object({
  phone: z.string().min(7),
  name: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
})

function pick<T extends object>(row: any): z.infer<typeof RowSchema> {
  // tolerant header mapping (case/space/underscore insensitive)
  const norm = (s: string) => s?.toString().toLowerCase().replace(/[^a-z0-9]/g, '')
  const m: Record<string, any> = {}
  for (const [k, v] of Object.entries(row)) m[norm(k)] = v

  return {
    phone: m.phone ?? m.phonenumber ?? m.tel ?? m.mobile,
    name: m.name ?? m.tenant ?? undefined,
    unit: m.unit ?? m.unitnumber ?? m.apartment ?? m.apt ?? undefined,
  } as any
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await ctx.params

  // Auth: staff/manager/owner; also verify property belongs to org
  let orgId: string
  try {
    ({ orgId } = await requireSessionOrgRole(['OWNER', 'MANAGER', 'STAFF']))
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const prop = await prisma.property.findFirst({
    where: { id: propertyId, organisationId: orgId },
    select: { id: true },
  })
  if (!prop) return NextResponse.json({ error: 'Property not found' }, { status: 404 })

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })

  const dryRun = form.get('dryRun') ? true : false
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 })

  const buf = Buffer.from(await file.arrayBuffer())
  let rows: any[] = []
  try {
    const wb = XLSX.read(buf, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
  } catch {
    return NextResponse.json({ error: 'Could not parse file' }, { status: 400 })
  }

  let created = 0
  let updated = 0
  let skipped = 0
  const errors: Array<{ row: number; message: string }> = []

  for (let i = 0; i < rows.length; i++) {
    const shaped = pick(rows[i])
    const parsed = RowSchema.safeParse(shaped)
    if (!parsed.success) {
      errors.push({ row: i + 2, message: 'Invalid row (missing phone/name/unit?)' })
      skipped++
      continue
    }

    const phone = normalizeUSPhone(String(parsed.data.phone))
    if (!phone) {
      errors.push({ row: i + 2, message: 'Invalid phone number' })
      skipped++
      continue
    }

    const name = parsed.data.name?.toString().trim() || undefined
    const unit = parsed.data.unit?.toString().trim() || undefined

    if (dryRun) {
      // simulate upsert existence check
      const exists = await prisma.tenant.findFirst({
        where: { organisationId: orgId, propertyId, phoneNumber: phone },
        select: { id: true },
      })
      exists ? (updated++) : (created++)
      continue
    }

    // Upsert by composite unique (phoneNumber, propertyId), normalized phone
    const res = await prisma.tenant.upsert({
      where: { phoneNumber_propertyId: { phoneNumber: phone, propertyId } },
      update: { name: name ?? undefined, unitNumber: unit ?? undefined },
      create: {
        organisationId: orgId,
        propertyId,
        phoneNumber: phone,
        name,
        unitNumber: unit,
      },
      select: { id: true },
    })

    await prisma.conversation.upsert({
      where: { organisationId_phoneNumber: { organisationId: orgId, phoneNumber: phone } },
      update: { propertyId, tenantId: res.id, state: 'IDLE', lastMessageAt: new Date() },
      create: { organisationId: orgId, phoneNumber: phone, propertyId, tenantId: res.id, state: 'IDLE' },
    })

    // crude create/update classification: try to find again quickly
    // (or rely on updateMany count, but this is fine)
    const wasExisting = await prisma.tenant.findFirst({
      where: { organisationId: orgId, propertyId, phoneNumber: phone, createdAt: { lt: new Date(Date.now() - 5000) } },
      select: { id: true },
    })
    wasExisting ? updated++ : created++
  }

  return NextResponse.json({ total: rows.length, created, updated, skipped, errors, dryRun })
}
