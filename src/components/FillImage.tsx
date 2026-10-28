'use client'

import { useState } from 'react'
import Image from 'next/image'
import { isOptimizedPosterUrl, posterUrl } from '@/libs/event'

/**
 * Cover-fit image for a `relative` frame. Drive-hosted images (lh3.googleusercontent.com)
 * go through next/image: as a hotlinked plain <img> Chrome's ORB blocks them
 * intermittently, which is what left the small cards on /events/manage blank.
 * Any other host stays a plain <img>, since next/image throws for hosts outside
 * `images.remotePatterns`.
 */
export default function FillImage({ src, alt = '', sizes, priority, className = 'object-cover' }: {
  src: string
  alt?: string
  sizes: string
  priority?: boolean
  className?: string
}) {
  // A dead link (unshared Drive file, deleted image) leaves the frame's hatch placeholder showing.
  const [failed, setFailed] = useState(false)
  if (failed) return null
  const url = posterUrl(src)
  if (isOptimizedPosterUrl(url)) {
    return <Image src={url} alt={alt} fill sizes={sizes} priority={priority} className={className} onError={() => setFailed(true)} />
  }
  return <img src={url} alt={alt} referrerPolicy="no-referrer" onError={() => setFailed(true)} className={`absolute inset-0 h-full w-full ${className}`} />
}
