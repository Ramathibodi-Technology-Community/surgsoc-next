import React from 'react'

/**
 * Stands in for a page whose data is not ready to show. Renders no records, so
 * nothing behind the route can leak while it is switched off.
 */
export default function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <div className="empty-note">
      <p className="font-medium text-secondary-foreground">{title}</p>
      <p className="mt-1 text-meta leading-relaxed text-muted-foreground">{note}</p>
    </div>
  )
}
