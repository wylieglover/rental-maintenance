'use client'

import { Property } from '@/types'
import { cn } from '@/lib/utils'
import { InputHTMLAttributes } from 'react'
import { Loader } from 'lucide-react'

interface Props
  extends Omit<
    InputHTMLAttributes<HTMLSelectElement>,
    'onChange' | 'onSelect'
  > {
  properties: Property[]
  selectedId: string
  onPropertySelect: (id: string) => void   // ← renamed
  loading?: boolean
}

export function PropertySelector({
  properties,
  selectedId,
  onPropertySelect,
  loading,
  className,
  ...rest
}: Props) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    )
  }

  return (
    <select
      value={selectedId}
      onChange={(e) => onPropertySelect(e.target.value)}
      className={cn(
        'h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm',
        className
      )}
      {...rest}
    >
      <option value="all">All Properties</option>
      {properties.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  )
}
