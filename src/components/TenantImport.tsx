'use client'

import { useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import toast from 'react-hot-toast'

type Props = { propertyId: string }

type Result = {
  total: number
  created: number
  updated: number
  skipped: number
  dryRun: boolean
  errors: { row: number; message: string }[]
}

export default function TenantImport({ propertyId }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [dryRun, setDryRun] = useState(true)
  const [result, setResult] = useState<Result | null>(null)

  const onFile = async (file: File) => {
    if (!file) return
    setBusy(true)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (dryRun) fd.append('dryRun', '1')

      const res = await fetch(`/api/properties/${propertyId}/tenants/import`, {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) throw new Error(await res.text())
      const json = (await res.json()) as Result
      setResult(json)
      toast.success(dryRun ? 'Dry-run complete' : 'Import completed')
    } catch (e: any) {
      toast.error(e?.message || 'Import failed')
    } finally {
      setBusy(false)
    }
  }

  const downloadTemplate = () => {
    const csv = 'phone,name,unit\n+15551234567,Jane Doe,12A\n+15557654321,John Smith,3\n'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'tenant_import_template.csv'
    document.body.appendChild(a)
    a.click()
    URL.revokeObjectURL(url)
    a.remove()
  }

  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium">Bulk import tenants</h3>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={downloadTemplate}>Download template</Button>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} />
            Dry-run
          </label>
          <Button
            variant="default"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            {busy ? 'Uploading…' : 'Upload CSV/XLSX'}
          </Button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.currentTarget.value = ''
        }}
      />

      {busy && <Skeleton className="h-10 w-full" />}

      {result && (
        <div className="rounded border p-3 text-sm">
          <p>
            Processed <strong>{result.total}</strong> rows
            {result.dryRun ? ' (dry-run)' : ''}. Created: <strong>{result.created}</strong>,
            Updated: <strong>{result.updated}</strong>, Skipped: <strong>{result.skipped}</strong>.
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-red-600">
              {result.errors.slice(0, 20).map((e, i) => (
                <li key={i}>
                  Row {e.row}: {e.message}
                </li>
              ))}
              {result.errors.length > 20 && (
                <li>…and {result.errors.length - 20} more</li>
              )}
            </ul>
          )}
        </div>
      )}

      <p className="text-xs text-gray-500">
        Columns accepted: <code>phone</code> (required), <code>name</code> (optional), <code>unit</code> (optional).<br />
        Phones are normalized to E.164 (+1…). The property is fixed to this page’s property.
      </p>
    </Card>
  )
}
