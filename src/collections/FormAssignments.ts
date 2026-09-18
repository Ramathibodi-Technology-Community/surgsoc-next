import { CollectionConfig } from 'payload'
import { NotificationService } from '../libs/notifications'
import { hasPermission } from '../libs/permissions'
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
    create: ({ req: { user } }) => {
        if (!user) return false
        return hasPermission(user as User, 'manage_forms')
    },
    update: ({ req: { user } }) => {
       if (!user) return false
       return hasPermission(user as User, 'manage_forms')
    },
    delete: ({ req: { user } }) => {
       if (!user) return false
       return hasPermission(user as User, 'manage_forms')
    },
  },
  hooks: {
      afterChange: [
          async ({ doc, operation, req: { payload } }) => {
              // Send email on creation
              if (operation === 'create') {
                  try {
                       const form = typeof doc.form === 'string'
                        ? await payload.findByID({ collection: 'forms', id: doc.form })
                        : doc.form

                       const user = typeof doc.user === 'string'
                        ? await payload.findByID({ collection: 'users', id: doc.user })
                        : doc.user

                       if (form && user) {
                           await NotificationService.sendFormAssignment({
                               form,
                               user,
                               deadline: doc.deadline,
                               // message: doc.custom_message // If we add this field
                           })
                           payload.logger.info(`[Notification] Sent form assignment to ${user.email}`)
                       }
                  } catch (error) {
                       payload.logger.error(`[Notification] Failed to send form assignment email: ${error}`)
                  }
              }
          }
      ]
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
      admin: { date: { pickerAppearance: 'dayAndTime' } },
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
        name: 'submission',
        type: 'relationship',
        relationTo: 'form-submissions',
        admin: {
            readOnly: true,
        }
    }
  ],
}
