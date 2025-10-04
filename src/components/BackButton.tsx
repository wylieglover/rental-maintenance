'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

export default function BackButton({
  fallback = '/dashboard',
  label = 'Back',
  className = '',
}: { fallback?: string; label?: string; className?: string }) {
  const router = useRouter()
  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      onClick={() => (history.length > 1 ? router.back() : router.push(fallback))}
      aria-label={label}
    >
      <ChevronLeft className="mr-1 h-4 w-4" />
      {label}
    </Button>
  )
}
