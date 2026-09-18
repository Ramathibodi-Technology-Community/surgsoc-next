import { CollectionConfig } from 'payload'
import { hasPermission } from '../libs/permissions'
import { User } from '@/payload-types'

export const TeamMembers: CollectionConfig = {
  slug: 'team-members',
  admin: {
    useAsTitle: 'position',
    group: 'Content',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => hasPermission(user as User, 'manage_content'),
    update: ({ req: { user } }) => hasPermission(user as User, 'manage_content'),
    delete: ({ req: { user } }) => hasPermission(user as User, 'manage_content'),
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'User',
      admin: {
        description: 'Link to user profile — pulls name, image, department from their account',
      },
    },
    {
      name: 'position',
      type: 'text',
      required: true,
      label: 'Position / Title',
      admin: {
        placeholder: 'e.g. President, VP of OD, Head of Academic',
      },
    },
    {
      name: 'academic_year',
      type: 'text',
      required: true,
      label: 'Academic Year',
      admin: {
        placeholder: 'e.g. 2025-2026',
      },
    },
    {
      name: 'is_current',
      type: 'checkbox',
      label: 'Current Team Member',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: 'Uncheck to move to Hall of Fame',
      },
    },
    {
      name: 'sort_order',
      type: 'number',
      label: 'Sort Order',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: 'Lower numbers appear first (President = 0, VP = 1, etc.)',
      },
    },
  ],
}
