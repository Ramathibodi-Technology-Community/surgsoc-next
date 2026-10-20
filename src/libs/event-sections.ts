// Which fields each staff editor owns. The edit-page sheets and the stepped
// create flow both read this, so a field lives in exactly one section and a
// sheet only ever sends its own keys (saveEvent ignores absent keys).

// choice = a few options shown as full-width rows (design.md: choices are rows);
// search = a long list you type into; poster = a URL with its image beside it.
export type FieldKind = 'text' | 'textarea' | 'number' | 'datetime' | 'select' | 'choice' | 'search' | 'multiselect' | 'richtext' | 'poster'
export type SectionField = { name: string; kind: FieldKind; required?: boolean; labelKey?: string }
export type EventStructure = 'standalone' | 'multi_day' | 'day'
export type EventSection = 'basics' | 'details' | 'joining' | 'registration' | 'reflection' | 'people'

// The group asks the common questions once; each session owns its seats, its window and any extra questions.
const APPLICATION: SectionField[] = [
  { name: 'subscription_form', kind: 'select', labelKey: 'events.editor.common_form' },
  { name: 'registration_opens_at', kind: 'datetime' },
  { name: 'registration_closes_at', kind: 'datetime' },
  ]
const SEATS: SectionField[] = [
  { name: 'subscription_form', kind: 'select', labelKey: 'events.editor.extra_form' },
  { name: 'registration_opens_at', kind: 'datetime' },
  { name: 'registration_closes_at', kind: 'datetime' },
  { name: 'participant_limit', kind: 'number' },
  { name: 'max_waiting_list', kind: 'number' },
  { name: 'registration_selection_mode', kind: 'choice', required: true },
  { name: 'loa_form', kind: 'select' },
  { name: 'custom_acceptance_email', kind: 'textarea' },
]

export function sectionFields(section: EventSection, structure: EventStructure = 'standalone'): SectionField[] {
  switch (section) {
    case 'basics': return [
      { name: 'name', kind: 'text', required: true },
      // A group has no type of its own: its types are those of its sessions.
      ...(structure === 'multi_day' ? [] : [{ name: 'event_type', kind: 'select', required: true } as SectionField]),
      { name: 'department', kind: 'select' },
      { name: 'date_begin', kind: 'datetime', required: true },
      { name: 'date_end', kind: 'datetime' },
      { name: 'location', kind: 'select' },
      { name: 'image_url', kind: 'poster' },
    ]
    case 'details': return [{ name: 'description', kind: 'textarea' }]
    case 'joining': return [{ name: 'participant_detail', kind: 'richtext' }]
    case 'registration': return structure === 'multi_day' ? APPLICATION : structure === 'day' ? SEATS : [...APPLICATION, ...SEATS.slice(3)]
    case 'reflection': return [
      { name: 'reflection_form', kind: 'select' },
      { name: 'reflection_release_at', kind: 'datetime' },
      { name: 'reflection_deadline', kind: 'datetime' },
    ]
    case 'people': return [
      { name: 'owner', kind: 'search' },
      { name: 'coordinator', kind: 'search' },
      { name: 'groups', kind: 'multiselect' },
    ]
  }
}

// Bangkok has no DST, so a fixed offset round-trips datetime-local exactly.
export const toLocalInput = (iso: unknown) => typeof iso === 'string' && iso ? new Date(Date.parse(iso) + 7 * 3600000).toISOString().slice(0, 16) : ''
export const fromLocalInput = (local: string) => local ? new Date(`${local}+07:00`).toISOString() : null
