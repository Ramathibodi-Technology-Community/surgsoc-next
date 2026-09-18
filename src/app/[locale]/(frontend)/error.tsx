'use client'

import React from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col justify-center items-center min-h-[50vh] gap-4">
      <h2 className="text-2xl font-bold text-destructive">Something went wrong!</h2>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-primary-1 text-white rounded hover:bg-primary-2 transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
