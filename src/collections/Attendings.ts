import { CollectionConfig } from 'payload'
import { hasPermission } from '../libs/permissions'
import { tagLabel, tagsOfKind } from '../libs/tags'
import { User } from '@/payload-types'
import { isSampleField } from '@/libs/sample-data'

export const Attendings: CollectionConfig = {
  slug: 'attendings',
  admin: {
    useAsTitle: 'display_name',
    group: 'Content',
  },
  access: {
    read: ({ req: { user } }) => {
      if (user && hasPermission(user as User, 'manage_content')) return true
      return { is_visible: { equals: true } }
    },
    create: ({ req: { user } }) => hasPermission(user as User, 'manage_content'),
    update: ({ req: { user } }) => hasPermission(user as User, 'manage_content'),
    delete: ({ req: { user } }) => hasPermission(user as User, 'manage_content'),
  },
  fields: [
    {
      name: 'name_thai',
      type: 'group',
      label: 'Thai Name',
      fields: [
        { name: 'first_name', type: 'text', required: true },
        { name: 'last_name', type: 'text', required: true },
      ],
    },
    {
      name: 'name_english',
      type: 'group',
      label: 'English Name',
      fields: [
        { name: 'first_name', type: 'text', required: true },
        { name: 'last_name', type: 'text', required: true },
      ],
    },
    {
      name: 'title',
      type: 'relationship',
      relationTo: 'tags',
      label: 'Academic Title',
      filterOptions: () => tagsOfKind('academic_title'),
    },
    {
      name: 'specialty',
      type: 'relationship',
      relationTo: 'tags',
      label: 'Specialty',
      // Shared with the attendings page, which groups its sections by this tag
      // and orders them by the tag's own sort_order — so the order a
      // coordinator sees in this dropdown is the order a reader sees.
      filterOptions: () => tagsOfKind('specialty'),
      admin: {
        position: 'sidebar',
      },
    },
    /*
      Marks this physician as the contact point for their specialty. The
      attendings page groups by `specialty` and lifts the flagged record out of
      the grid to head its section, where the contact details below are shown in
      full rather than as a single trailing line.

      A flag on the physician rather than a `secretaries` collection: specialty
      is a tag, not an entity with a record of its own, so there is nothing to
      hang a separate row off — and the contact fields it would need already
      live here. One flag beats a second table that would duplicate them.

      Nothing enforces one per specialty; if two are flagged the page shows the
      first by `sort_order`, which is the same rule that orders everything else
      on the page.
    */
    {
      name: 'is_secretary',
      type: 'checkbox',
      label: 'Secretary for this specialty',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Heads their specialty section with contact details shown.',
      },
    },
    {
      name: 'image_url',
      type: 'text',
      label: 'Profile Photo URL',
    },
    {
      name: 'contact',
      type: 'group',
      label: 'Contact',
      /*
        Row-level `read` above only gates on `is_visible`, so without this every
        visible physician's email and phone went out on `GET /api/attendings` to
        anonymous callers. The attendings page never showed them that data — it
        renders contact details only for the one flagged `is_secretary` per
        specialty (`attendings/page.tsx:157,193`) — so the REST surface was
        publishing strictly more than the UI ever did.

        Mirroring the page's own rule here rather than filtering in the page:
        the field is the one place every caller routes through, and the same
        reasoning as the hidden-details field on Events (`Events.ts:245`).
        Server-rendered pages that need more must pass `overrideAccess: true`
        after establishing the caller may see it.
      */
      access: {
        read: ({ req: { user }, doc }) => {
          if (user && hasPermission(user as User, 'manage_content')) return true
          return doc?.is_secretary === true
        },
      },
      fields: [
        { name: 'email', type: 'email' },
        { name: 'phone_number', type: 'text', label: 'Phone' },
      ],
    },
    {
      name: 'bio',
      type: 'richText',
      label: 'Biography',
    },
    {
      name: 'is_visible',
      type: 'checkbox',
      label: 'Visible on Website',
      defaultValue: true,
      admin: {
        position: 'sidebar',
      },
    },
    isSampleField,
    {
      name: 'sort_order',
      type: 'number',
      label: 'Sort Order',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: 'Lower numbers appear first',
      },
    },
    // Virtual display name
    {
      name: 'display_name',
      type: 'text',
      admin: { hidden: true },
      hooks: {
        afterRead: [
          async ({ data, req }) => {
            let titleStr = tagLabel(data?.title) || ''

            // Depth 0 leaves the relationship as a bare id. Only then is the
            // extra lookup worth paying for — at any populated depth the call
            // above already answered.
            if (!titleStr && data?.title != null && typeof data.title !== 'object') {
              try {
                const titleDoc = await req.payload.findByID({
                  collection: 'tags',
                  id: data.title,
                })
                titleStr = tagLabel(titleDoc) || ''
              } catch {
                // Deleted tag — the name still renders without the title.
              }
            }

            const first = data?.name_english?.first_name || data?.name_thai?.first_name || ''
            const last = data?.name_english?.last_name || data?.name_thai?.last_name || ''
            return [titleStr, first, last].filter(Boolean).join(' ')
          },
        ],
      },
    },
  ],
}
