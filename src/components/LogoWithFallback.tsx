'use client'

import Image from 'next/image'
import { useState } from 'react'

export default function LogoWithFallback() {
  const [imageError, setImageError] = useState(false)

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary">
      {imageError ? (
        <span className="text-[10px] font-bold text-primary-foreground">RASS</span>
      ) : (
        <Image
          src="/assets/logo_surgsoc.jpg"
          alt="RASS"
          width={36}
          height={36}
          className="h-9 w-9 object-cover"
          onError={() => setImageError(true)}
        />
      )}
    </span>
  )
}
