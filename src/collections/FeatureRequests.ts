import type { CollectionConfig } from 'payload'
import type { User } from '@/payload-types'
import { hasPermission } from '../libs/permissions'

export const FeatureRequests: CollectionConfig = {
  slug: 'feature-requests',
  admin: {
    useAsTitle: 'title',
    group: 'Admin',
    defaultColumns: ['title', 'type', 'status', 'createdAt'],
  },
  access: {
    read: ({ req: { user } }) => hasPermission(user as User, 'manage_users'),
    create: ({ req: { user } }) => Boolean(user),
    update: ({ req: { user } }) => hasPermission(user as User, 'manage_users'),
    delete: ({ req: { user } }) => hasPermission(user as User, 'manage_users'),
  },
  hooks: {
    beforeChange: [
      ({ data, operation, req: { user } }) => {
        if (operation !== 'create' || !user || hasPermission(user as User, 'manage_users')) {
          return data
        }

        data.submitted_by = user.id
        data.status = 'open'
        delete data.admin_notes
        return data
      },
    ],
  },
  fields: [
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Bug Report', value: 'bug' },
        { label: 'Feature Request', value: 'feature' },
      ],
      defaultValue: 'feature',
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      maxLength: 120,
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Open', value: 'open' },
        { label: 'Planned', value: 'planned' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Done', value: 'done' },
        { label: 'Closed', value: 'closed' },
      ],
      defaultValue: 'open',
      access: {
        update: ({ req: { user } }) => hasPermission(user as User, 'manage_users'),
      },
    },
    {
      name: 'admin_notes',
      type: 'textarea',
      access: {
        read: ({ req: { user } }) => hasPermission(user as User, 'manage_users'),
        update: ({ req: { user } }) => hasPermission(user as User, 'manage_users'),
      },
    },
    {
      name: 'submitted_by',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
      defaultValue: ({ user }: any) => user?.id,
    },
  ],
}
