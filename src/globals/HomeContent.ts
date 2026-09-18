import type { GlobalConfig } from 'payload'
import { hasPermission } from '../libs/permissions'
import type { User } from '@/payload-types'

export const HomeContent: GlobalConfig = {
  slug: 'home-content',
  label: 'Home Content',
  admin: {
    group: 'Content',
  },
  access: {
    read: () => true,
    update: ({ req: { user } }) => hasPermission(user as User, 'manage_content'),
  },
  fields: [
    {
      name: 'hero',
      type: 'group',
      label: 'Hero',
      admin: {
        description: 'The banner at the top of the home page. Blank fields fall back to the built-in copy.',
      },
      fields: [
        {
          name: 'eyebrow',
          type: 'text',
          admin: {
            description: 'Small line above the title.',
            placeholder: 'e.g. Est. 2014 \u00b7 Faculty of Medicine, Mahidol University',
          },
        },
        {
          name: 'heading',
          type: 'text',
          admin: { placeholder: 'e.g. Ramathibodi Surgical Society' },
        },
        {
          name: 'subheading',
          type: 'text',
          admin: {
            description: 'Sits under the title, set in the display face. Used for the Thai name.',
            placeholder: 'e.g. \u0e0a\u0e21\u0e23\u0e21\u0e28\u0e31\u0e25\u0e22\u0e28\u0e32\u0e2a\u0e15\u0e23\u0e4c \u0e23\u0e32\u0e21\u0e32\u0e18\u0e34\u0e1a\u0e14\u0e35',
          },
        },
        {
          name: 'lead',
          type: 'textarea',
          admin: { description: 'The paragraph above the buttons.' },
        },
        {
          name: 'imageUrl',
          type: 'text',
          admin: { description: 'Hero image. Defaults to /assets/beta.jpg.' },
        },
        {
          name: 'ctas',
          type: 'array',
          label: 'Buttons',
          labels: { singular: 'Button', plural: 'Buttons' },
          maxRows: 2,
          admin: {
            description: 'Up to two. The first is solid, the second outlined. Leave empty for the default pair.',
          },
          fields: [
            { name: 'label', type: 'text', required: true },
            {
              name: 'href',
              type: 'text',
              required: true,
              admin: { placeholder: '/events' },
            },
          ],
        },
      ],
    },
    {
      name: 'labels',
      type: 'group',
      label: 'Section Labels',
      admin: {
        description:
          'Headings and captions on the home page. The numbers beside the captions are counted live from the database \u2014 only the wording is editable here. Blank fields keep the built-in wording.',
      },
      fields: [
        {
          name: 'memberStat',
          type: 'text',
          label: 'Member count caption',
          admin: {
            description: 'Under the big number in the stat band.',
            placeholder: 'e.g. Members on the register',
          },
        },
        {
          name: 'sessionStat',
          type: 'text',
          label: 'Session count caption',
          admin: { placeholder: 'e.g. sessions listed' },
        },
        {
          name: 'advisorStat',
          type: 'text',
          label: 'Advisor count caption',
          admin: { placeholder: 'e.g. faculty advisors' },
        },
        {
          name: 'pendingHeading',
          type: 'text',
          label: 'Outstanding forms heading',
          admin: {
            description: 'Heads the block of forms a signed-in student still owes. Hidden when they owe none.',
            placeholder: 'e.g. Needs your attention',
          },
        },
        {
          name: 'upcomingHeading',
          type: 'text',
          label: 'Upcoming events heading',
          admin: { placeholder: 'e.g. Upcoming' },
        },
        {
          name: 'pastHeading',
          type: 'text',
          label: 'Past events heading',
          admin: { placeholder: 'e.g. Past sessions' },
        },
        {
          name: 'pastLink',
          type: 'text',
          label: 'Past events link',
          admin: {
            description: 'The link to the full events list, beside the past events heading.',
            placeholder: 'e.g. Full archive',
          },
        },
      ],
    },
    {
      name: 'sections',
      type: 'array',
      label: 'About Sections',
      admin: {
        description: 'The alternating image/text story blocks under the hero. Order here is order on the page.',
      },
      labels: {
        singular: 'Section',
        plural: 'Sections',
      },
      fields: [
        {
          name: 'kicker',
          type: 'text',
          required: false,
          admin: {
            description: 'Small label shown above the section title.',
          },
        },
        {
          name: 'heading',
          type: 'text',
          required: true,
        },
        {
          name: 'body',
          type: 'textarea',
          required: true,
        },
        {
          name: 'imageUrl',
          type: 'text',
          required: false,
          admin: {
            description: 'Optional image URL for this section.',
          },
        },
      ],
    },
  ],
}
