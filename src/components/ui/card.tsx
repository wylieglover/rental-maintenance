// src/components/ui/card.tsx
import { ReactNode, forwardRef, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/* Let Card accept any <div> attributes, including onClick */
interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

/* Using forwardRef keeps the DOM ref chain intact */
export const Card = forwardRef<HTMLDivElement, Props>(
  ({ children, className, ...rest }, ref) => (
    <div
      ref={ref}
      {...rest}
      className={cn(
        'rounded-lg border border-gray-200 bg-white shadow-sm',
        className
      )}
    >
      {children}
    </div>
  )
)
Card.displayName = 'Card'

/* Optional helpers remain unchanged — keep if you use them elsewhere */
export function CardHeader({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn('border-b border-gray-200 px-4 py-3', className)}
    >
      {children}
    </div>
  )
}

export function CardContent({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={cn('p-4', className)}>
      {children}
    </div>
  )
}

export function CardFooter({
  children,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn('border-t border-gray-200 px-4 py-3', className)}
    >
      {children}
    </div>
  )
}
