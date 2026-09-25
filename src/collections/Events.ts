
import { CollectionConfig } from 'payload'
import { canAssignForms, hasPermission } from '../libs/permissions'
import { idOf, reconcileEventReflection } from '../libs/form-assignment-lifecycle'
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
  hooks: {
    beforeChange: [({ data, originalDoc, req }) => {
      const fields = [
        'reflection_form',
        'reflection_release_at',
        'reflection_deadline',
        'reflection_released_early_at',
        'reflection_released_early_by',
      ]
      const changesAssignment = fields.some((field) => Object.prototype.hasOwnProperty.call(data, field) && data[field] !== originalDoc?.[field])
      if (changesAssignment && req.user && !canAssignForms(req.user as User)) {
        throw new Error('Only VP, President, or superadmin can change reflection assignment settings.')
      }
      return data
    }],
    afterChange: [async ({ doc, req }) => {
      if (idOf(doc.reflection_form) && doc.reflection_deadline) {
        await reconcileEventReflection(req.payload, doc, req.user?.id, (req.context?.assignmentSource as 'early_release' | undefined) || 'manual_reconcile', req)
      }
    }],
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
                      timeIntervals: 10,
                    },
                  },
                },
                {
                  name: 'date_end',
                  type: 'date',
                  admin: {
                    date: {
                      pickerAppearance: 'dayAndTime',
                      timeIntervals: 10,
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
                  admin: { date: { pickerAppearance: 'dayAndTime', timeIntervals: 10 } },
                },
                {
                  name: 'registration_closes_at',
                  type: 'date',
                  admin: { date: { pickerAppearance: 'dayAndTime', timeIntervals: 10 } },
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
              name: 'registration_selection_mode',
              type: 'select',
              label: 'Registration Selection',
              options: [
                { label: 'Manual review', value: 'manual' },
                { label: 'Automatically accept (attendee confirms)', value: 'accepted' },
                { label: 'Automatically confirm', value: 'confirmed' },
              ],
              defaultValue: 'manual',
              required: true,
            },
            {
              name: 'eventApplicantsLink',
              type: 'ui',
              admin: {
                  components: {
                      Field: '@/components/payload/EventApplicantsLink#default',
                  }
              },
            },
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
              name: 'reflection_release_at',
              type: 'date',
              admin: {
                date: { pickerAppearance: 'dayAndTime', timeIntervals: 10 },
                description: 'Defaults to event end when left blank. Set to now to release early.',
              },
            },
            {
              name: 'reflection_deadline',
              type: 'date',
              admin: { date: { pickerAppearance: 'dayAndTime', timeIntervals: 10 } },
            },
            { name: 'reflection_released_early_at', type: 'date', admin: { readOnly: true } },
            { name: 'reflection_released_early_by', type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
            {
              name: 'release_reflection_now',
              type: 'ui',
              admin: { components: { Field: '@/components/payload/ReleaseReflectionButton#ReleaseReflectionButton' } },
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
