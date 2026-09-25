import { CollectionConfig } from 'payload'
import { canAssignForms, hasPermission } from '../libs/permissions'
import type { User } from '../payload-types'

export const FormAssignments: CollectionConfig = {
  slug: 'form-assignments',
  admin: {
    useAsTitle: 'id',
    group: 'Forms',
  },
  access: {
    read: ({ req: { user } }) => {
       if (!user) return false
       if (hasPermission(user as User, 'manage_forms')) return true
       return { user: { equals: user.id } }
    },
    create: ({ req: { user } }) => canAssignForms(user as User),
    update: () => false,
    delete: () => false,
  },
  hooks: {
    beforeChange: [({ data, operation }) => {
      if (operation === 'create' && (!data.deadline || !data.kind || !data.source)) {
        throw new Error('New form assignments require a deadline, kind, and source.')
      }
      return data
    }],
  },
  fields: [
    {
      name: 'form',
      type: 'relationship',
      relationTo: 'forms',
      required: true,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'assigned_by',
      type: 'relationship',
      relationTo: 'users',
      admin: {
          readOnly: true,
      },
      defaultValue: ({ user }: any) => user?.id,
    },
    {
      name: 'deadline',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayAndTime', timeIntervals: 10 } },
    },
    {
      name: 'completed',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'blocks_registration',
      type: 'checkbox',
      label: 'Blocks Event Registration',
      defaultValue: false,
      admin: {
          description: 'If checked, the user cannot register for events until this form is completed.',
      }
    },
    {
      name: 'kind',
      type: 'select',
      options: ['event_reflection', 'annual_survey'],
    },
    {
      name: 'source',
      type: 'select',
      options: ['automatic_event', 'annual_policy', 'early_release', 'manual_reconcile'],
    },
    { name: 'active_at', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime', timeIntervals: 10 } } },
    { name: 'cancelled_at', type: 'date', admin: { readOnly: true } },
    { name: 'source_event', type: 'relationship', relationTo: 'events', admin: { readOnly: true } },
    { name: 'survey_academic_year', type: 'relationship', relationTo: 'academic-terms', admin: { readOnly: true } },
    {
        name: 'submission',
        type: 'relationship',
        relationTo: 'form-submissions',
        admin: {
            readOnly: true,
        }
    }
  ],
}
