import type { GlobalConfig } from 'payload'
import { revalidateTag } from 'next/cache'
import { hasPermission } from '../libs/permissions'
import { SITE_SETTINGS_TAG } from '../libs/site-settings'
import type { User } from '@/payload-types'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site Settings',
  admin: {
    group: 'Settings',
  },
  access: {
    read: () => true,
    update: ({ req: { user } }) => hasPermission(user as User, 'manage_content'),
  },
  hooks: {
    /*
      getSiteSettings() is `use cache`'d because it sits on every route's
      critical path. Without this, an admin changing the society name — or
      toggling showSampleData / enablePasswordReset — would not take effect
      until the cache expired. The two toggles are the reason this is not
      optional: both are switches someone flips expecting it to be immediate.

      Scripts import this config too, where there is no Next cache to
      revalidate; revalidateTag throws outside a request scope, so it is
      guarded rather than allowed to fail a seed run.
    */
    afterChange: [
      () => {
        try {
          revalidateTag(SITE_SETTINGS_TAG, 'max')
        } catch {
          // Outside a Next request (seed/migration scripts) — nothing to invalidate.
          // 'max' rather than updateTag(): updateTag is Server-Action-only, and a
          // Payload admin save arrives as a plain REST POST.
        }
      },
    ],
  },
  fields: [
    {
      name: 'siteName',
      type: 'text',
      label: 'Society Name',
      admin: {
        description: 'Full name. Used in the header, footer, and page titles.',
        placeholder: 'Ramathibodi Surgical Society',
      },
    },
    {
      name: 'shortName',
      type: 'text',
      label: 'Wordmark',
      admin: {
        description: 'The short mark beside the logo and in the footer.',
        placeholder: 'RASS',
      },
    },
    {
      name: 'metaDescription',
      type: 'textarea',
      label: 'Site Description',
      admin: {
        description: 'Used as the default <meta name="description"> for the public site.',
      },
    },
    {
      name: 'enableI18n',
      type: 'checkbox',
      label: 'Enable i18n',
      defaultValue: true,
      admin: {
        description: 'Controls whether language switching is enabled on the public site.',
      },
    },
    {
      name: 'showSampleData',
      type: 'checkbox',
      label: 'Show Sample Data',
      defaultValue: false,
      admin: {
        description:
          'Reveals every record flagged "Sample Data" on the public site and in the home page counts. Leave off outside of a demo.',
      },
    },
    {
      name: 'enablePasswordReset',
      type: 'checkbox',
      label: 'Enable Password Reset',
      defaultValue: false,
      admin: {
        description:
          'Opens the public self-service password-reset path and sends an email through our (quota-limited) Resend account for every request. Normally leave this off; switch it on only while someone needs to recover an account, then switch it back off.',
      },
    },
    {
      name: 'eventCardImageDisplay',
      type: 'select',
      label: 'Event Card Image Display',
      defaultValue: 'shrink-img-to-fit',
      options: [
        { label: 'Expand card to fit image', value: 'expand-card' },
        { label: 'Shrink image to fit card', value: 'shrink-img-to-fit' },
        { label: 'Crop image to fill card', value: 'crop-to-fit' },
      ],
      admin: {
        description:
          'Posters vary in shape — a portrait Drive upload next to a wide banner. "Shrink image to fit" keeps every card the same size and letterboxes the image inside it. "Crop image to fill card" keeps that same card size but crops the poster to fill it with no letterboxing. "Expand card to fit image" drops the fixed shape and lets each card grow to the poster’s own proportions, so the grid loses its even rows.',
      },
    },
    {
      name: 'eventDetailImageDisplay',
      type: 'select',
      label: 'Event Detail Image Display',
      defaultValue: 'shrink-img-to-fit',
      options: [
        { label: 'Full size', value: 'full-size' },
        { label: 'Shrink image to fit', value: 'shrink-img-to-fit' },
        { label: 'Crop image to fill', value: 'crop-to-fit' },
      ],
      admin: {
        description:
          'How the poster on an event’s own page sizes. "Shrink image to fit" keeps the banner’s fixed shape and letterboxes the image inside it. "Crop image to fill" keeps that same shape but crops the poster to fill it with no letterboxing. "Full size" shows the poster at its own proportions instead.',
      },
    },
  ],
}
