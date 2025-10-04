import Link from 'next/link'
import { notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { PriorityBadge } from '@/components/PriorityBadge'
import UpdatePanel from '@/components/UpdatePanel'
import TicketImages from '@/components/TicketImages'
import AssignTenantButton from '@/components/AssignTenantButton'
import type { Metadata } from 'next'
import BackButton from '@/components/BackButton'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  return { title: `Ticket #${id.slice(-6)} • Dashboard` }
}

export default async function TicketDetailPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  const orgId = (session?.user as any)?.orgId as string | undefined
  if (!orgId) notFound()

  const ticket = await prisma.ticket.findFirst({
    where: { id, organisationId: orgId },
    include: { property: true, tenant: true },
  })
  if (!ticket) notFound()

  const role = (session?.user as { role?: string } | undefined)?.role
  const canEdit = role === 'MANAGER' || role === 'STAFF'

  const refreshPath = async () => {
    'use server'
    revalidatePath(`/dashboard/tickets/${id}`)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* header */}
      <div className="flex items-center gap-4">
        <BackButton fallback="/dashboard/tickets" />
        <div className="flex-1 flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              Ticket #{ticket.id.slice(-6)}
            </h1>
          </div>
          {canEdit && (
            <AssignTenantButton
              tenantId={ticket.tenantId}
              currentPropertyId={ticket.propertyId}
            />
          )}
        </div>
      </div>

      {/* ticket info card */}
      <div className="bg-white border rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Property</h3>
              <Link
                href={`/dashboard/properties/${ticket.propertyId}`}
                className="text-blue-600 hover:underline font-medium"
              >
                {ticket.property.name}
              </Link>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Tenant</h3>
              {ticket.tenant ? (
                <div className="space-y-2">
                  <Link
                    href={`/dashboard/tenants/${ticket.tenantId}`}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {ticket.tenant.name || 'Unnamed'}
                  </Link>
                  <div className="space-y-1">
                    {ticket.tenant.unitNumber && (
                      <div className="text-sm text-gray-600">Unit {ticket.tenant.unitNumber}</div>
                    )}
                    {ticket.tenant.phoneNumber && (
                      <a 
                        href={`tel:${ticket.tenant.phoneNumber}`} 
                        className="text-blue-600 hover:underline text-sm block"
                      >
                        {ticket.tenant.phoneNumber}
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <span className="text-gray-500">—</span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Priority</h3>
              <PriorityBadge priority={ticket.priority as any} />
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Created</h3>
              <div className="text-gray-900">{new Date(ticket.createdAt).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* description */}
      {ticket.description && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Description</h3>
          <p className="whitespace-pre-line text-gray-900 leading-relaxed">{ticket.description}</p>
        </div>
      )}

      {/* images */}
      {ticket.imageUrls.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Images</h3>
          <TicketImages urls={ticket.imageUrls as string[]} />
        </div>
      )}

      {/* manager / staff edit panel */}
      {canEdit && (
        <UpdatePanel
          ticketId={ticket.id}
          initialStatus={ticket.status as any}
          initialPriority={ticket.priority as any}
          onSaved={refreshPath}
        />
      )}
    </div>
  )
}