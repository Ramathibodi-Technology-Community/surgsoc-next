'use client'

import { useState } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'
import { releaseReflectionNow } from '@/actions/release-reflection'

export function ReleaseReflectionButton() {
  const { id } = useDocumentInfo()
  const [status, setStatus] = useState('')
  if (!id || id === 'create') return null

  return (
    <div>
      <button
        type="button"
        onClick={async () => {
          try {
            await releaseReflectionNow(id)
            setStatus('Released now.')
            window.location.reload()
          } catch (error) {
            setStatus(error instanceof Error ? error.message : 'Could not release reflection forms.')
          }
        }}
      >
        Release reflection now
      </button>
      {status && <p>{status}</p>}
    </div>
  )
}
