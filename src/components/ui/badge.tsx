import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'success' | 'warning' | 'error' | 'destructive' | 'outline'

interface Props extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant
}

const variantMap: Record<Variant, string> = {
  default: 'bg-gray-100 text-gray-900',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
  destructive: 'bg-red-100 text-red-800',
  outline: 'border border-gray-300 text-gray-700 bg-transparent'
}

export function Badge({ variant = 'default', className, ...props }: Props) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold',
        variantMap[variant],
        className
      )}
      {...props}
    />
  )
}