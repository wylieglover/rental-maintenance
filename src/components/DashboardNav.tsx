'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Home,
  ClipboardList,
  Building2,
  Users,
  Wrench
} from 'lucide-react'

const links = [
  { href: '/dashboard',          label: 'Overview',  icon: Home },
  { href: '/dashboard/tickets',  label: 'Tickets',   icon: ClipboardList },
  { href: '/dashboard/properties', label: 'Properties', icon: Building2 },
  { href: '/dashboard/tenants', label: 'Tenants', icon: Users }, 
  { href: '/dashboard/settings', label: 'Settings', icon: Wrench } 
]

export default function DashboardNav() {
  const pathname = usePathname()

  return (
    /* mobile top-bar on small screens, sidebar on md+ */
    <aside className="bg-white border-r md:w-56">
      <nav className="flex md:flex-col overflow-x-auto">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 md:px-6 px-4 py-3 text-sm font-medium',
                active
                  ? 'bg-gray-100 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden md:inline">{label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
