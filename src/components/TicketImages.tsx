'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'

interface Props {
  urls: string[]
}

export default function TicketImages({ urls }: Props) {
  const [active, setActive] = useState<string | null>(null)

  // Close on Escape
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setActive(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {urls.map((u) => (
          <Image
            key={u}
            src={u}
            alt="ticket"
            width={300}
            height={200}
            className="cursor-pointer rounded-md object-cover"
            onClick={() => setActive(u)}
            unoptimized
          />
        ))}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setActive(null)}
        >
          <button
            aria-label="Close"
            className="absolute right-4 top-4 text-white"
            onClick={() => setActive(null)}
          >
            <X className="h-6 w-6" />
          </button>

          <div onClick={(e) => e.stopPropagation()}>
            <Image
              src={active}
              alt="full screen ticket"
              width={1200}
              height={800}
              className="max-h-full w-auto rounded-md"
              unoptimized
            />
          </div>
        </div>
      )}
    </>
  )
}
