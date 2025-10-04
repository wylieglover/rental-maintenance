// POST → create an Organisation and add current user as OWNER
// GET  → list orgs the current user belongs to
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const CreateSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), // kebab-case
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // normalize slug to lowercase before validating
  const body = await req.json().catch(() => null)
  const parsed = CreateSchema.safeParse({
    ...body,
    slug: typeof body?.slug === 'string' ? body.slug.toLowerCase() : body?.slug,
  })
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { name, slug } = parsed.data

  try {
    const org = await prisma.$transaction(async (tx) => {
      const created = await tx.organisation.create({ data: { name, slug } })
      await tx.orgMembership.create({
        data: { userId: session.user.id, organisationId: created.id, role: 'OWNER' },
      })
      return created
    })

    // small, useful payload
    return NextResponse.json(
      { organisation: { id: org.id, name: org.name, slug: org.slug } },
      { status: 201 }
    )
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Slug already taken' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const memberships = await prisma.orgMembership.findMany({
    where: { userId: session.user.id },
    select: {
      role: true,
      organisation: { select: { id: true, name: true, slug: true, createdAt: true } },
    },
    orderBy: { organisation: { createdAt: 'desc' } },
  })

  return NextResponse.json({
    items: memberships.map((m) => ({ role: m.role, ...m.organisation })),
  })
}
