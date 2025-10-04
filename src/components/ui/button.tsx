import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'outline' | 'ghost' | 'destructive'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const base =
  'inline-flex items-center justify-center font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50'

const variantMap: Record<Variant, string> = {
  default: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600',
  outline:
    'border border-gray-300 hover:bg-gray-50 focus-visible:ring-gray-400 text-gray-900',
  ghost: 'hover:bg-gray-100 text-gray-900',
  destructive:
    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600'
}

const sizeMap: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base'
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'default', size = 'md', className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(base, variantMap[variant], sizeMap[size], className)}
      {...props}
    />
  )
)
Button.displayName = 'Button'
