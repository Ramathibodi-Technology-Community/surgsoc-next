'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ENTITY_BY_COLLECTION: Record<string, string> = {
  users: 'users',
  events: 'events',
  forms: 'forms',
  'form-submissions': 'form-submissions',
  registrations: 'registrations',
}

export function CollectionImportLink() {
  const pathname = usePathname()
  const match = pathname.match(/\/admin\/collections\/([^/]+)/)
  const collection = match?.[1] || ''
  const entity = ENTITY_BY_COLLECTION[collection]

  const href = entity ? `/admin/data-import?entity=${entity}` : '/admin/data-import'

  return (
    <div style={{ marginBottom: 12 }}>
      <Link
        href={href}
        style={{
          display: 'inline-block',
          borderRadius: 4,
          border: '1px solid var(--theme-elevation-150)',
          padding: '8px 12px',
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
          color: 'var(--theme-text)',
          background: 'var(--theme-elevation-50)',
        }}
      >
        Import {entity ? entity.replace('-', ' ') : 'Data'}
      </Link>
    </div>
  )
}
