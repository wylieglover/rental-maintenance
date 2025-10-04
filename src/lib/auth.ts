import { PrismaAdapter } from '@next-auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import {
  getServerSession,
  type NextAuthOptions,
  type DefaultSession,
} from 'next-auth'
import { prisma } from '@/lib/prisma'

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: DefaultSession['user'] & {
      id: string
      role: string
      orgId: string | null
      orgSlugs: string[]
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string
    orgId?: string | null
    orgSlugs?: string[]
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  // We keep everything in a JWT so pages/edge middleware can read it.
  session: { strategy: 'jwt' },

  // Use our pretty sign-in page instead of the default /api/auth/signin
  pages: {
    signIn: '/signin',
    error: '/signin',
  },

  callbacks: {
    /**
     * Keep the token up-to-date with org membership on every request.
     * We prefer the newest membership (by id). If you add createdAt
     * to OrgMembership later, change orderBy to createdAt: 'desc'.
     */
    async jwt({ token, user }) {
      const userId = user?.id ?? token.sub
      if (!userId) return token

      const memberships = await prisma.orgMembership.findMany({
        where: { userId },
        orderBy: { id: 'desc' },
        include: { organisation: { select: { slug: true } } },
        take: 20,
      })

      token.role = memberships[0]?.role ?? 'TENANT'
      token.orgId = memberships[0]?.organisationId ?? null
      token.orgSlugs = memberships.map((m) => m.organisation.slug)
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.sub!
        ;(session.user as any).role = token.role ?? 'TENANT'
        ;(session.user as any).orgId = token.orgId ?? null
        ;(session.user as any).orgSlugs = token.orgSlugs ?? []
      }
      return session
    },
  },
}

export function auth() {
  return getServerSession(authOptions)
}

export type Role = 'OWNER' | 'MANAGER' | 'STAFF' | 'TENANT'

/** Legacy/global default-role check (uses the JWT’s default role). */
export async function requireRole(role: Role | Role[]) {
  const session = await auth()
  const allowed = Array.isArray(role) ? role : [role]
  if (!session || !allowed.includes((session.user as any).role)) {
    throw new Error('Forbidden')
  }
}

/** Require the caller to have one of `roles` in their *current session org* (session.user.orgId). */
export async function requireSessionOrgRole(roles: Role[]) {
  const session = await auth()
  const userId = (session?.user as any)?.id as string | undefined
  const orgId = (session?.user as any)?.orgId as string | undefined
  if (!userId || !orgId) throw new Error('Forbidden')

  const m = await prisma.orgMembership.findFirst({
    where: { userId, organisationId: orgId },
    select: { role: true },
  })
  if (!m || !roles.includes(m.role as Role)) throw new Error('Forbidden')

  return { userId, orgId, role: m.role as Role }
}

/** Require the caller to have one of `roles` in the *specified* orgId (for /orgs/[id]/* routes). */
export async function requireOrgRole(orgId: string, roles: Role[]) {
  const session = await auth()
  const userId = (session?.user as any)?.id as string | undefined
  if (!userId) throw new Error('Unauthorized')

  const m = await prisma.orgMembership.findFirst({
    where: { userId, organisationId: orgId },
    select: { role: true },
  })
  if (!m || !roles.includes(m.role as Role)) throw new Error('Forbidden')

  return { userId, orgId, role: m.role as Role }
}
