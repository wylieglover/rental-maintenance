// src/app/page.tsx
import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const metadata = {
  title: 'UnitFix — Text-to-Ticket for Property Managers',
  description:
    'Tenants text a photo. You get an organized, prioritized maintenance ticket. One number per org. No app required.',
}

// ensure we never cache role/org gating
export const dynamic = 'force-dynamic'

export default async function Home() {
  const session = await auth()

  if (session?.user) {
    const orgId = (session.user as any).orgId as string | null
    const role  = (session.user as any).role as string | undefined

    // Tenants shouldn’t see staff onboarding/landing.
    // If you don’t have a tenant area yet, change to redirect('/api/auth/signout') or similar.
    if (role === 'TENANT') {
      redirect('/tenant') // TODO: point to your tenant portal route
    }

    // Staff without an org yet → onboarding
    if (!orgId) {
      redirect('/onboarding')
    }

    // Must have at least one property AND at least one *active* org number
    // that is attached to a property (propertyId not null).
    const [hasProperty, hasAssignedActiveNumber] = await Promise.all([
      prisma.property.count({ where: { organisationId: orgId! } }).then(n => n > 0),
      prisma.orgNumber.count({
        where: { organisationId: orgId!, active: true, NOT: { propertyId: null } },
      }).then(n => n > 0),
    ])

    const ready = hasProperty && hasAssignedActiveNumber
    redirect(ready ? '/dashboard' : '/onboarding')
  }

  // ------- public marketing page for signed-out users -------
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white via-white to-gray-50">
      {/* decorative blobs */}
      <div className="pointer-events-none absolute inset-x-0 -top-40 -z-10 blur-3xl">
        <div
          className="mx-auto h-80 max-w-2xl rotate-6 bg-gradient-to-tr from-blue-500/30 via-indigo-400/30 to-emerald-400/30 opacity-60"
          style={{ clipPath: 'polygon(0% 20%, 15% 0%, 60% 10%, 100% 0%, 85% 65%, 20% 100%, 0% 75%)' }}
        />
      </div>

      {/* nav */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <Image src="/logo.svg" alt="Logo" width={32} height={32} className="h-8 w-8" />
          <span className="text-sm font-semibold tracking-tight">UnitFix</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/signin"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Sign in
          </Link>
        </div>
      </nav>

      {/* hero */}
      <section className="mx-auto max-w-5xl px-6 pb-16 pt-8 text-center sm:pt-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-balance text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Tenants text a photo. <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">You get a ticket.</span>
          </h1>
          <p className="mt-5 text-pretty text-base text-gray-600 sm:text-lg">
            Stop chasing voicemails and emails. Give each property manager a dedicated number.
            We parse photos and messages into prioritized maintenance tickets—automatically.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <a
              href="/signin"
              className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Get started — it’s free
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center rounded-lg px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              See how it works
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 opacity-60">
            <span className="text-xs uppercase tracking-wide text-gray-500">
              Trusted by small to mid-size property teams
            </span>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-4xl rounded-xl border bg-white/60 p-2 shadow-sm backdrop-blur">
          <div className="grid items-center gap-6 p-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4 text-left">
              <p className="text-xs font-semibold text-gray-500">Example SMS</p>
              <div className="mt-3 space-y-3 text-sm">
                <div className="w-fit rounded-2xl bg-gray-100 px-3 py-2 text-gray-800">Hi, the sink is leaking in 2B.</div>
                <div className="w-fit rounded-2xl bg-gray-100 px-3 py-2 text-gray-800"><span className="italic">[Photo attached]</span></div>
                <div className="ml-auto w-fit rounded-2xl bg-blue-600 px-3 py-2 text-white">
                  Got it! We created ticket #102394. We’ll follow up shortly.
                </div>
              </div>
            </div>

            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-900">Why text-first?</h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-600">
                <li>• Faster than portals or email</li>
                <li>• Photos/notes auto-organized into tickets</li>
                <li>• One number per property, route to the right property</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* features */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: 'Text & photo ingestion', desc: 'Tenants send a picture + message. We store media securely and attach it to a ticket.' },
            { title: 'Automatic triage', desc: 'Category + priority defaults from keywords; managers can tweak in one click.' },
            { title: 'Per-org phone number', desc: 'Provision a Twilio number in seconds; swap anytime without downtime.' },
            { title: 'Property matching', desc: 'Know which building/unit a tenant is in; reassign in a couple of clicks.' },
            { title: 'Subdomain & SSO', desc: 'acme.yourapp.com with Google Sign-In and role-based access.' },
            { title: 'Built for speed', desc: 'Zero fluff UI, instant search & filters, mobile-friendly.' },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section id="how-it-works" className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-center text-2xl font-bold text-gray-900">How it works</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {[
            { step: '1', title: 'Connect a number', desc: 'Provision a Twilio number from Settings.' },
            { step: '2', title: 'Add properties', desc: 'Create properties and tenants.' },
            { step: '3', title: 'Share the number', desc: 'Tenants text photos; you triage in the dashboard.' },
          ].map((s) => (
            <div key={s.step} className="rounded-xl border bg-white p-6 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">{s.step}</div>
              <h3 className="font-semibold text-gray-900">{s.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <a
            href="/signin"
            className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Get started
          </a>
        </div>
      </section>

      {/* footer */}
      <footer className="mx-auto max-w-7xl px-6 py-10 text-sm text-gray-500">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p>© {new Date().getFullYear()} UnitFix</p>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="hover:text-gray-700">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-700">Terms</Link>
            <a href="mailto:support@example.com" className="hover:text-gray-700">Support</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
