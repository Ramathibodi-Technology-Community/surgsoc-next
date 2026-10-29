'use client'

import { useState } from 'react'
import Image from 'next/image'
import FillImage from '@/components/FillImage'
import { isOptimizedPosterUrl } from '@/libs/event'

/**
 * The poster on the event page: the column's width, the image's own height, so
 * nothing needs a blur to fill a frame. Only a very tall poster is capped, and
 * then the blurred copy fills the bars beside it. No poster, or one that fails
 * to load, leaves the 3:4 hatch with the seal, so the column does not jump.
 */
export default function PosterFigure({ src, alt, children }: { src: string; alt: string; children?: React.ReactNode }) {
  const [failed, setFailed] = useState(false)
  const frame = 'relative overflow-hidden rounded-md border border-border'

  if (!src || failed) {
    return <div className={`placeholder-hatch poster-slot aspect-[3/4] ${frame}`}>{children}</div>
  }

  return (
    <div className={`poster-slot bg-base-1 ${frame}`}>
      <FillImage src={src} sizes="340px" className="object-cover poster-backdrop" />
      {isOptimizedPosterUrl(src) ? (
        <Image
          className="relative z-[1] mx-auto h-auto max-h-[35rem] w-full object-contain"
          style={{ width: '100%', height: 'auto' }}
          alt={alt}
          src={src}
          width={680}
          height={907}
          sizes="(max-width: 1024px) 100vw, 340px"
          onError={() => setFailed(true)}
        />
      ) : (
        <img
          className="relative z-[1] mx-auto block h-auto max-h-[35rem] w-full object-contain"
          alt={alt}
          src={src}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      )}
      {children}
    </div>
  )
}
