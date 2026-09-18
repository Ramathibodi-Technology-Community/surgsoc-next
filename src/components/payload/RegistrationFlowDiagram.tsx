import React from 'react'

/*
  Was a client-side `mermaid.render()` of a hardcoded 14-line state diagram —
  ~3MB of dependency, shipped to every admin page load, to lay out twelve
  arrows. The transitions are the content; the box-and-line rendering was not
  carrying information a grouped list does not.
*/
const TRANSITIONS: { from: string; to: string; when: string }[] = [
  { from: '—', to: 'applicant', when: 'User registers' },
  { from: 'applicant', to: 'accepted', when: 'Organizer selects' },
  { from: 'applicant', to: 'rejected', when: 'Organizer rejects' },
  { from: 'applicant', to: 'subscribed', when: 'Capacity full' },
  { from: 'subscribed', to: 'accepted', when: 'Slot opens (auto-promote)' },
  { from: 'accepted', to: 'confirmed', when: 'User confirms (CTA)' },
  { from: 'accepted', to: 'declined', when: 'User submits LOA form (CTA)' },
  { from: 'confirmed', to: 'participant', when: 'Event ends' },
  { from: 'confirmed', to: 'declined', when: 'User submits LOA' },
  { from: 'participant', to: '—', when: 'Submit reflection' },
  { from: 'declined', to: '—', when: 'Withdrawn' },
  { from: 'rejected', to: '—', when: 'Terminal' },
]

export default function RegistrationFlowDiagram() {
  return (
    <div className="field-type ui-field">
      <label className="field-label">Registration Lifecycle</label>
      <ul className="p-4 bg-white/50 rounded-lg border border-border/50 space-y-1 text-sm list-none m-0">
        {TRANSITIONS.map(({ from, to, when }) => (
          <li key={`${from}->${to}-${when}`} className="flex flex-wrap items-baseline gap-2">
            <code>{from}</code>
            <span aria-hidden>→</span>
            <code>{to}</code>
            <span className="text-muted-foreground">{when}</span>
          </li>
        ))}
      </ul>
      <div className="text-xs text-muted-foreground mt-2">
        How user statuses transition. Organize users in the &quot;Registrations&quot; collection.
      </div>
    </div>
  )
}
