
import { CollectionConfig } from 'payload'
import { hasPermission } from '../libs/permissions'
import { tagsOfKind } from '../libs/tags'
import { User } from '@/payload-types'
import { isSampleField } from '@/libs/sample-data'


export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'name',
    group: 'Management',
    components: {
      beforeListTable: ['@/components/payload/CollectionImportLink#CollectionImportLink'],
    },
  },
  access: {
    read: ({ req: { user } }) => {
      if (user && hasPermission(user as User, 'manage_events')) return true
      return { is_visible: { equals: true } }
    },
    create: ({ req: { user } }) => {
      if (!user) return false
      return hasPermission(user as User, 'manage_events')
    },
    update: ({ req: { user } }) => {
       if (!user) return false
       if (hasPermission(user as User, 'manage_events')) return true
       // Event owners can update their own events
       return { owner: { equals: user.id } }
    },
    delete: ({ req: { user } }) => {
       if (!user) return false
       if (hasPermission(user as User, 'manage_events')) return true
       return { owner: { equals: user.id } }
    },
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        // ── Tab 1: Basic Info ────────────────────────────────
        {
          label: 'Basic Info',
          fields: [
            {
              name: 'name',
              type: 'text',
              required: true,
            },
            {
              name: 'event_type',
              type: 'relationship',
              relationTo: 'tags',
              label: 'Event Type',
              filterOptions: () => tagsOfKind('event_type'),
              required: true,
              admin: {
                description: 'Managed under Utilities → Tags. Adding a type is a row, not a deploy.',
              },
            },
            {
              name: 'department',
              type: 'relationship',
              relationTo: 'tags',
              label: 'Organizing Department',
              filterOptions: () => tagsOfKind('department'),
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'date_begin',
                  type: 'date',
                  required: true,
                  admin: {
                    date: {
                      pickerAppearance: 'dayAndTime',
                    },
                  },
                },
                {
                  name: 'date_end',
                  type: 'date',
                  admin: {
                    date: {
                      pickerAppearance: 'dayAndTime',
                    },
                  },
                },
              ],
            },
            {
              name: 'location',
              type: 'relationship',
              relationTo: 'tags',
              label: 'Location',
              filterOptions: () => tagsOfKind('location'),
              admin: {
                description:
                  'Managed under Utilities → Tags. Nest a venue under its campus with the Parent field.',
              },
            },
            {
              name: 'image_url',
              type: 'text',
              label: 'Poster Image URL',
            },
            {
              name: 'description',
              type: 'textarea',
            },
            {
              name: 'is_visible',
              type: 'checkbox',
              defaultValue: true,
            },
            // Legacy JSON field, keeping for backward compatibility if needed, or migration
            {
              name: 'info',
              type: 'json',
              admin: {
                  readOnly: true,
                  description: 'Legacy info field (read-only)',
                  condition: (data) => !!data.info,
                  components: {
                    Field: '@/components/payload/JsonView#JsonView',
                  },
              }
            },
          ],
        },

        // ── Tab 2: Application (Form & Config) ───────────────
        {
          label: 'Application',
          fields: [
            {
              name: 'subscription_form',
              type: 'relationship',
              relationTo: 'forms',
              required: false,
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'registration_opens_at',
                  type: 'date',
                  admin: { date: { pickerAppearance: 'dayAndTime' } },
                },
                {
                  name: 'registration_closes_at',
                  type: 'date',
                  admin: { date: { pickerAppearance: 'dayAndTime' } },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'participant_limit',
                  type: 'number',
                  label: 'Participant Limit',
                  admin: {
                    description: 'Maximum number of participants (0 = unlimited)',
                  },
                  defaultValue: 0,
                },
                {
                  name: 'is_registration_closed',
                  type: 'checkbox',
                  label: 'Force Close Registration',
                },
              ],
            },
            {
              name: 'status_override',
              type: 'radio',
              options: [
                { label: 'Auto (Time-based)', value: 'auto' },
                { label: 'Force Open', value: 'open' },
                { label: 'Force Closed', value: 'closed' },
              ],
              defaultValue: 'auto',
              admin: {
                description: 'Override automatic opening/closing times',
                layout: 'horizontal',
              },
            },
          ],
        },

        // ── Tab 3: Participants (Selection & Details) ───────
        {
          label: 'Participants',
          fields: [
            {
              name: 'registrationFlowDiagram', // Visual Aid
              type: 'ui',
              admin: {
                  components: {
                      Field: '@/components/payload/RegistrationFlowDiagram#default',
                  }
              },
            },
            {
              type: 'row',
              fields: [
                {
                    name: 'auto_promote',
                    type: 'checkbox',
                    label: 'Auto-promote from Waiting List',
                    admin: {
                        description: 'Automatically promote waiting list users when a slot opens',
                    }
                },
                {
                    name: 'max_waiting_list',
                    type: 'number',
                    min: 0,
                    admin: {
                        description: 'Limit size of waiting list (0 = unlimited)',
                    }
                },
              ],
            },
            {
              name: 'custom_acceptance_email',
              type: 'textarea',
              label: 'Custom Acceptance Email Message',
              admin: {
                  description: 'Optional message included in the acceptance email',
              }
            },
            {
                name: 'participant_detail',
                type: 'richText',
                label: 'Hidden Details (Revealed to Confirmed Participants)',
                admin: {
                  description: 'Add LINE group link, meeting location, instructions here. Only visible to users with "confirmed" status.',
                },
                access: {
                  // REST API: only staff with manage_events see this field.
                  // Server-rendered pages that need to show it to confirmed participants
                  // must call payload with `overrideAccess: true` AFTER verifying the
                  // user's registration status. This keeps the raw /api/events/:id
                  // endpoint from leaking hidden details to unauthenticated clients.
                  read: ({ req: { user } }) => {
                    if (!user) return false
                    return hasPermission(user as User, 'manage_events')
                  },
                },
            },
            {
                name: 'loa_form',
                type: 'relationship',
                relationTo: 'forms',
                label: 'Leave of Absence Form',
                admin: {
                  description: 'Form users submit to request leave. Linked from the "Decline" button.',
                },
            },
          ],
        },

        // ── Tab 4: Feedback ──────────────────────────────────
        {
          label: 'Feedback',
          fields: [
            {
              name: 'reflection_form',
              type: 'relationship',
              relationTo: 'forms',
            },
            {
              name: 'is_reflection_open',
              type: 'checkbox',
              label: 'Open Reflection Form',
            },
          ],
        },
      ],
    },

    // Sidebar items
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'coordinator',
      type: 'relationship',
      relationTo: 'users',
      label: 'Event Coordinator',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'groups',
      type: 'relationship',
      relationTo: 'groups',
      hasMany: true,
      admin: {
        position: 'sidebar',
      },
    },
    isSampleField,
  ],
}
