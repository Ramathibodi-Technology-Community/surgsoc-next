'use client'

import React from 'react'
import { FieldLabel, useField } from '@payloadcms/ui'

/*
  Read-only replacement for Payload's default `json` field UI.

  The default renders Monaco, whose AMD loader is fetched from
  cdn.jsdelivr.net at runtime. Our CSP allows scripts from 'self' only, so the
  browser blocks it and Monaco's init promise rejects with a bare DOM error
  Event — an unhandled rejection with no message, which is what showed up in
  the console as an unreadable stack of vendor frames.

  These fields are only ever read in the admin (form answers, a legacy blob),
  so a <pre> is both sufficient and easier to scan than an editor.
*/
export const JsonView: React.FC<{
  path?: string
  field?: { label?: unknown }
}> = ({ path, field }) => {
  const { value } = useField<unknown>({ path })

  return (
    <div className="field-type">
      <FieldLabel label={field?.label as string | undefined} path={path} />
      <pre
        style={{
          background: 'var(--theme-elevation-50)',
          border: '1px solid var(--theme-elevation-150)',
          borderRadius: '4px',
          padding: '0.75rem',
          margin: 0,
          maxHeight: '24rem',
          overflow: 'auto',
          fontSize: '0.8rem',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {value == null ? '—' : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  )
}
