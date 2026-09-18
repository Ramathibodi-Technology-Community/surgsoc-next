import type { GlobalConfig } from 'payload'
import { hasPermission } from '../libs/permissions'
import type { User } from '@/payload-types'

export const TermsContent: GlobalConfig = {
  slug: 'terms-content',
  label: 'Terms Content',
  admin: {
    group: 'Content',
  },
  access: {
    read: () => true,
    update: ({ req: { user } }) => hasPermission(user as User, 'manage_content'),
  },
  fields: [
    {
      name: 'intro',
      type: 'textarea',
      required: false,
      admin: {
        description: 'Optional intro paragraph shown under the page heading.',
      },
    },
    {
      name: 'sections',
      type: 'array',
      label: 'Policy Sections',
      labels: {
        singular: 'Section',
        plural: 'Sections',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'content',
          type: 'textarea',
          required: true,
        },
      ],
    },
  ],
}
