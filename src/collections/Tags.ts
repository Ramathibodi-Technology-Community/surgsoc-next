import { CollectionConfig, Where } from 'payload'
import { hasPermission } from '../libs/permissions'
import type { User } from '@/payload-types'

/**
 * The shared label vocabulary: event types, departments, specialties, academic
 * titles, years, tracks, locations.
 *
 * One collection rather than seven because every one of them is the same
 * record — a label, a stable code, an order, and a retired flag. `kind`
 * discriminates; `parent` nests where a vocabulary has levels (a room under a
 * campus).
 *
 * Deliberately NOT `groups`. Groups are the auth object: they carry a
 * permissions bitmask, a member list, and a `read` gated on `!!user`. These
 * labels render on the public events and attendings pages to signed-out
 * visitors, so they cannot live behind that gate. Phase 3 links the two with
 * `groups.tag` for the three vocabularies that are both a label and a
 * membership (department, year, track).
 */
export const Tags: CollectionConfig = {
  slug: 'tags',
  labels: { singular: 'Tag', plural: 'Tags' },
  admin: {
    useAsTitle: 'label',
    group: 'Utilities',
    defaultColumns: ['label', 'kind', 'parent', 'sort_order', 'active'],
    listSearchableFields: ['label', 'label_th', 'slug'],
    description: 'Editable lists used across the site. Add a row to add an option.',
  },
  access: {
    // Public on purpose — see the note above.
    read: () => true,
    create: ({ req: { user } }) => hasPermission(user as User, 'manage_content'),
    update: ({ req: { user } }) => hasPermission(user as User, 'manage_content'),
    delete: ({ req: { user } }) => hasPermission(user as User, 'manage_content'),
  },
  defaultSort: 'sort_order',
  fields: [
    {
      name: 'kind',
      type: 'select',
      required: true,
      index: true,
      admin: { position: 'sidebar' },
      options: [
        { label: 'Event Type', value: 'event_type' },
        { label: 'Department', value: 'department' },
        { label: 'Specialty', value: 'specialty' },
        { label: 'Academic Title', value: 'academic_title' },
        { label: 'Academic Year', value: 'year' },
        { label: 'Track', value: 'track' },
        { label: 'Location', value: 'location' },
      ],
    },
    {
      name: 'label',
      type: 'text',
      required: true,
      label: 'Label (English)',
    },
    {
      name: 'label_th',
      type: 'text',
      label: 'Label (Thai)',
      admin: { description: 'Optional. Shown on the Thai site; falls back to the English label.' },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description:
          'Stable code for imports and seeds. Prefix by kind so codes stay unique: dept-ia, type-workshop-full, spec-urology.',
      },
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'tags',
      /*
        Nesting only makes sense inside one vocabulary — a room's parent is a
        campus, never a specialty. Enforced through filterOptions rather than a
        hook so it constrains the REST API too, not just the admin dropdown.

        Both clauses are conditional, because Payload runs this to validate the
        value on write as well as to populate the dropdown:

        - On a create there is no `id` yet. `{ id: { not_equals: undefined } }`
          matches nothing, so every parent was rejected — which is what broke
          the location seed.
        - A PATCH that sends only `parent` carries no `kind`, and the same
          thing happens to the kind clause. Left unconstrained rather than
          failing closed: `parent` carries no privilege — tags are public
          labels — so a wrong parent is untidy, not unsafe, and rejecting
          legitimate edits is the worse failure.
      */
      filterOptions: ({ id, data }): Where => {
        const clauses: Where[] = []
        if (data?.kind) clauses.push({ kind: { equals: data.kind } })
        if (id) clauses.push({ id: { not_equals: id } })
        return clauses.length > 0 ? { and: clauses } : {}
      },
      admin: {
        description: 'Optional. Used by Locations to nest a venue under its campus.',
      },
    },
    {
      name: 'sort_order',
      type: 'number',
      defaultValue: 0,
      index: true,
      admin: { position: 'sidebar', description: 'Lower numbers appear first.' },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description:
          'Uncheck to retire. Records already holding it keep it and still display it; only new pickers hide it.',
      },
    },
  ],
}
