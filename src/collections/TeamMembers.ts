import { CollectionConfig } from 'payload'
import { hasPermission } from '../libs/permissions'
import { ensureAcademicTermTag } from '../libs/academic-term'
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
  hooks: {
    // Defaults a new member to the current term so nobody has to know
    // "academic-terms" exists, let alone create this year's row by hand —
    // it's the same auto-create AcademicTerms.ts locks humans out of.
    beforeValidate: [async ({ data, operation, req }) => {
      if (operation === 'create' && data && !data.academic_year) {
        const term = await ensureAcademicTermTag(req.payload, new Date(), req)
        data.academic_year = term.id
      }
      return data
    }],
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
      type: 'relationship',
      relationTo: 'academic-terms',
      required: true,
      label: 'Academic Year',
      admin: {
        description: 'Defaults to the current term. Change only when logging a past team.',
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
