'use client'

import Link from 'next/link'

export function AdminQuickLinks() {
  return (
    <div style={{ margin: '0 0 16px 0', padding: '0 8px' }}>
      <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--theme-text)' }}>Quick Actions</div>
      <Link
        href="/admin/data-import"
        style={{
          display: 'block',
          borderRadius: 8,
          border: '1px solid var(--theme-elevation-150)',
          padding: '8px 10px',
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Data Import
      </Link>
    </div>
  )
}
