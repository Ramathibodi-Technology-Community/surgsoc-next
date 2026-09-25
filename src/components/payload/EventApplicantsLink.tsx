'use client'

import { useDocumentInfo } from '@payloadcms/ui'
import { defaultLocale } from '@/i18n/config'

// Payload has no per-event applicant view of its own; the real one — with
// status filtering and accept/reject actions — already lives on the public
// site's staff-only applicants page. This just links to it instead of
// building a second renderer inside the admin panel.
export default function EventApplicantsLink() {
  const { id } = useDocumentInfo()
  if (!id || id === 'create') return null

  return (
    <div className="field-type ui-field">
      <a href={`/${defaultLocale}/events/${id}/applicants`} target="_blank" rel="noopener noreferrer">
        View all applicants →
      </a>
    </div>
  )
}
