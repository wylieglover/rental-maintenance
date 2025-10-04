'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  TicketStatus,
  TicketPriority,
  TicketCategory,
  TicketWithRelations,
  Property
} from '@/types'
import {
  useTickets,
  useCreateTicket,
  type CreateTicketDto
} from '@/hooks/useTickets'
import { useProperties } from '@/hooks/useProperties'
import { useTenants } from '@/hooks/useTenants'
import { TicketList } from '@/components/TicketList'
import { PropertySelector } from '@/components/PropertySelector'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  RefreshCw,
  Plus,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle
} from 'lucide-react'

interface TicketStats {
  total: number
  open: number
  emergency: number
  inProgress: number
}

export default function TicketsPage() {
  const router = useRouter()

  /* -------------------------------------------------------------------- */
  /*  Filter state                                                         */
  /* -------------------------------------------------------------------- */
  const [propertyId, setPropertyId] = useState<string>('all')
  const [status, setStatus] = useState<TicketStatus | 'all'>('all')
  const [priority, setPriority] = useState<TicketPriority | 'all'>('all')
  const [category, setCategory] = useState<TicketCategory | 'all'>('all')
  const [showFilters, setShowFilters] = useState(false)

  /* -------------------------------------------------------------------- */
  /*  Pagination state                                                     */
  /* -------------------------------------------------------------------- */
  const [page, setPage] = useState(1)
  const pageSize = 25

  /* -------------------------------------------------------------------- */
  /*  Data hooks                                                           */
  /* -------------------------------------------------------------------- */
  const {
    data: tData,
    isLoading: tLoading,
    error: ticketsError,
    refetch
  } = useTickets({
    propertyId: propertyId === 'all' ? undefined : propertyId,
    status: status === 'all' ? undefined : status,
    priority: priority === 'all' ? undefined : priority,
    category: category === 'all' ? undefined : category,
    page,
    pageSize
  })

  const {
    data: pData,
    isLoading: pLoading,
    error: propertiesError
  } = useProperties({ page: 1, pageSize: 200 })

  /* -------------------------------------------------------------------- */
  /*  Derived data                                                         */
  /* -------------------------------------------------------------------- */
  const tickets: TicketWithRelations[] = tData?.items ?? []
  const properties: Property[] = pData?.items ?? []
  const total = tData?.total ?? 0
  const lastPage = Math.max(1, Math.ceil(total / pageSize))

  // Stats calculation
  const stats: TicketStats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === 'OPEN').length,
    emergency: tickets.filter((t) => t.priority === 'EMERGENCY').length,
    inProgress: tickets.filter((t) => t.status === 'IN_PROGRESS').length
  }

  /* -------------------------------------------------------------------- */
  /*  Modal state                                                          */
  /* -------------------------------------------------------------------- */
  const [open, setOpen] = useState(false)
  const create = useCreateTicket()

  /* -------------------------------------------------------------------- */
  /*  Event handlers                                                       */
  /* -------------------------------------------------------------------- */
  const reset = () => {
    setPage(1)
    refetch()
  }

  const next = () => setPage((p) => Math.min(p + 1, lastPage))
  const prev = () => setPage((p) => Math.max(p - 1, 1))

  const handleSet =
    <T extends string>(fn: React.Dispatch<React.SetStateAction<T>>) =>
    (val: T) => {
      fn(val)
      setPage(1)
    }

  const clearFilters = () => {
    setPropertyId('all')
    setStatus('all')
    setPriority('all')
    setCategory('all')
    setPage(1)
  }

  /* -------------------------------------------------------------------- */
  /*  Error state                                                          */
  /* -------------------------------------------------------------------- */
  if (propertiesError || ticketsError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-6 max-w-md">
          <div className="text-center">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              Something went wrong
            </h2>
            <p className="mb-4 text-gray-600">
              {(propertiesError as any)?.message ||
                (ticketsError as any)?.message}
            </p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </Card>
      </div>
    )
  }

  /* -------------------------------------------------------------------- */
  /*  Main UI                                                              */
  /* -------------------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
              <p className="mt-1 text-sm text-gray-500">
                Track and manage maintenance requests across all properties
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
              <Button onClick={() => refetch()} disabled={tLoading}>
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${tLoading ? 'animate-spin' : ''}`}
                />
                Refresh
              </Button>
              <Button onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Ticket
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {/* Total Tickets */}
          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Tickets</p>
                {tLoading ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total}
                  </p>
                )}
              </div>
              <div className="rounded-full bg-blue-100 p-3">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </Card>

          {/* Open Tickets */}
          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Open</p>
                {tLoading ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.open}
                  </p>
                )}
              </div>
              <div className="rounded-full bg-yellow-100 p-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </Card>

          {/* Emergency Tickets */}
          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Emergency</p>
                {tLoading ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  <p className="text-2xl font-bold text-red-600">
                    {stats.emergency}
                  </p>
                )}
              </div>
              <div className="rounded-full bg-red-100 p-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </Card>

          {/* In Progress Tickets */}
          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">
                  In Progress
                </p>
                {tLoading ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  <p className="text-2xl font-bold text-green-600">
                    {stats.inProgress}
                  </p>
                )}
              </div>
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Property Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  Property:
                </span>
                <PropertySelector
                  properties={properties}
                  selectedId={propertyId}
                  onPropertySelect={handleSet(setPropertyId)}
                  loading={pLoading}
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  Status:
                </span>
                <select
                  value={status}
                  onChange={(e) => handleSet(setStatus)(e.target.value as any)}
                  className="h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  Priority:
                </span>
                <select
                  value={priority}
                  onChange={(e) => handleSet(setPriority)(e.target.value as any)}
                  className="h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm"
                >
                  <option value="all">All Priority</option>
                  <option value="EMERGENCY">Emergency</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">
                  Category:
                </span>
                <select
                  value={category}
                  onChange={(e) => handleSet(setCategory)(e.target.value as any)}
                  className="h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm"
                >
                  <option value="all">All Categories</option>
                  <option value="PLUMBING">Plumbing</option>
                  <option value="ELECTRICAL">Electrical</option>
                  <option value="HVAC">HVAC</option>
                  <option value="APPLIANCE">Appliance</option>
                  <option value="COSMETIC">Cosmetic</option>
                  <option value="PEST_CONTROL">Pest Control</option>
                  <option value="SECURITY">Security</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear All
              </Button>
            </div>
          </Card>
        )}

        {/* Ticket List */}
        <TicketList tickets={tickets} loading={tLoading} onTicketUpdate={reset} />

        {/* Pagination */}
        {total > pageSize && (
          <div className="flex items-center justify-end gap-4">
            <span className="text-sm text-gray-600">
              Page {page} of {lastPage} ({total} total tickets)
            </span>
            <Button variant="outline" size="sm" disabled={page === 1} onClick={prev}>
              Prev
            </Button>
            <Button variant="outline" size="sm" disabled={page === lastPage} onClick={next}>
              Next
            </Button>
          </div>
        )}
      </section>

      {/* New Ticket Modal */}
      {open && (
        <NewTicketModal
          propertyId={propertyId === 'all' ? undefined : propertyId}
          onClose={() => setOpen(false)}
          onSave={(dto) =>
            create.mutate(dto, {
              onSuccess: (ticket) => {
                toast.success('Ticket created')
                setOpen(false)
                reset()
                router.push(`/dashboard/tickets/${ticket.id}`)
              }
            })
          }
        />
      )}
    </div>
  )
}

/* -------------------------- New Ticket Modal --------------------------- */
interface ModalProps {
  propertyId?: string
  onClose: () => void
  onSave: (dto: CreateTicketDto) => void
}

function NewTicketModal({ propertyId, onClose, onSave }: ModalProps) {
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM')
  const [category, setCategory] = useState<TicketCategory>('OTHER')

  // tenant search
  const [q, setQ] = useState('')
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null)
  const { data: search, isLoading: searching } = useTenants({
    q,
    propertyId,
    page: 1,
    pageSize: 8,
  })

  // uploads
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)

  const canSave = !!propertyId && !!selectedTenantId && !uploading

  const handleFiles = (f: FileList | null) => {
    if (!f) return
    const arr = Array.from(f).slice(0, 5)
    setFiles(arr)
  }

  const uploadImages = async (): Promise<string[]> => {
    if (files.length === 0) return []
    setUploading(true)
    try {
      const fd = new FormData()
      for (const f of files) fd.append('files', f)
      const res = await fetch('/api/uploads', { method: 'POST', body: fd })
      if (!res.ok) throw new Error(await res.text())
      const data = (await res.json()) as { urls: string[] }
      return data.urls ?? []
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <Card className="w-full max-w-md space-y-6 p-6">
        <h2 className="text-lg font-semibold">New Ticket</h2>

        <textarea
          className="w-full rounded-md border p-2 text-sm"
          rows={3}
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="flex gap-4">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TicketPriority)}
            className="flex-1 rounded-md border px-3 py-2 text-sm"
          >
            {['EMERGENCY', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as TicketCategory)}
            className="flex-1 rounded-md border px-3 py-2 text-sm"
          >
            {['PLUMBING','ELECTRICAL','HVAC','APPLIANCE','COSMETIC','PEST_CONTROL','SECURITY','OTHER']
              .map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* Tenant search & pick */}
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Search tenant by name or phone"
            value={q}
            onChange={(e) => { setQ(e.target.value); setSelectedTenantId(null) }}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          {q && (
            <div className="rounded-md border">
              {searching && <div className="p-2 text-sm text-gray-500">Searching…</div>}
              {search?.items?.length ? (
                <ul className="max-h-48 overflow-auto text-sm">
                  {search.items.map((t) => (
                    <li key={t.id}>
                      <button
                        className={`flex w-full items-center justify-between px-3 py-2 hover:bg-gray-50 ${selectedTenantId === t.id ? 'bg-gray-50' : ''}`}
                        onClick={() => setSelectedTenantId(t.id)}
                      >
                        <span>{t.name ?? t.phoneNumber}</span>
                        <span className="text-gray-500">{t.property?.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                !searching && <div className="p-2 text-sm text-gray-500">No results.</div>
              )}
            </div>
          )}
          {selectedTenantId && (
            <p className="text-xs text-green-700">Tenant selected ✅</p>
          )}
        </div>

        {/* Upload photos (optional) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Photos (optional)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="block w-full text-sm"
          />
          {files.length > 0 && (
            <p className="text-xs text-gray-500">{files.length} file(s) ready to upload</p>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={uploading}>Cancel</Button>
          <Button
            disabled={!canSave}
            onClick={async () => {
              try {
                const imageUrls = await uploadImages()
                onSave({
                  description,
                  category,
                  priority,
                  imageUrls,
                  tenantId: selectedTenantId!, // cuid
                  propertyId: propertyId!,     // required by API
                })
              } catch (e: any) {
                toast.error(e?.message || 'Upload failed')
              }
            }}
          >
            {uploading ? 'Uploading…' : 'Save'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
