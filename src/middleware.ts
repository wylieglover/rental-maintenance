import { withAuth } from 'next-auth/middleware'

/**
 * Central gating:
 * - We explicitly list what the middleware should intercept in `config.matcher`.
 * - Then we decide per-path whether a JWT (token) is required and/or a staff role.
 */
export default withAuth({
  pages: { signIn: '/signin' },

  callbacks: {
    authorized({ token, req }) {
      // If there is no token, withAuth will redirect to /signin automatically
      // for matched routes unless we return true explicitly below.
      const p = req.nextUrl.pathname
      const method = req.method
      const role = (token?.role as string) ?? 'TENANT'
      const isStaff = role === 'OWNER' || role === 'MANAGER' || role === 'STAFF'

      // 1) Always allow NextAuth internals
      if (p.startsWith('/api/auth')) return true

      // 2) Public org access request endpoint (from the "Need access?" page)
      //    POST /api/orgs/[id]/access-requests should be open to non-signed users.
      if (/^\/api\/orgs\/[^/]+\/access-requests$/.test(p)) return true

      // 3) Signed-in users can visit onboarding & dashboard
      if (p.startsWith('/onboarding') || p.startsWith('/dashboard')) {
        return !!token
      }

      // 4) Allow creating a new org when signed in
      if (p === '/api/orgs' && method === 'POST') {
        return !!token
      }

      // 5) Staff-only APIs
      if (
        p.startsWith('/api/tickets') ||
        p.startsWith('/api/properties') ||
        p.startsWith('/api/tenants') ||
        p.startsWith('/api/uploads') ||        // image uploads used by New Ticket modal
        p.startsWith('/api/orgs') ||           // includes /api/orgs/[id]/invites
        p.startsWith('/api/invites')           // any session-based invites endpoints
      ) {
        return isStaff
      }

      // Default: if it matched, require a token
      return !!token
    },
  },
})

export const config = {
  matcher: [
    // app pages
    '/onboarding',
    '/dashboard/:path*',

    // staff APIs
    '/api/tickets/:path*',
    '/api/properties/:path*',
    '/api/tenants/:path*',
    '/api/uploads/:path*',
    '/api/orgs/:path*',
    '/api/invites/:path*',

    // NextAuth internal endpoints (we allow them above)
    '/api/auth/:path*',
  ],
}
