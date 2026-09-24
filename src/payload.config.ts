import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { formBuilderPlugin, fields as defaultFormFields } from '@payloadcms/plugin-form-builder'
import { resendAdapter } from '@payloadcms/email-resend'

import { Users } from './collections/Users'
import { Events } from './collections/Events'
import { Groups } from './collections/Groups'
import { Registrations } from './collections/Registrations'
import { FormAssignments } from './collections/FormAssignments'

// Form Builder Custom Blocks
import {
  SliderBlock,
  RankingBlock,
  CheckboxGroupBlock,
  UserProfileBlock,
  conditionalGroup,
} from './blocks/form-fields'

import { User } from './payload-types'
import { hasPermission, formSubmissionAccess } from './libs/permissions'
import { Attendings } from './collections/Attendings'
import { Tags } from './collections/Tags'
import { TeamMembers } from './collections/TeamMembers'
import { HomeContent } from './globals/HomeContent'
import { TermsContent } from './globals/TermsContent'
import { SiteSettings } from './globals/SiteSettings'
import { FeatureRequests } from './collections/FeatureRequests'
import { assertAppEnv } from './libs/env'


// The plugin deep-merges our per-field config over its default block with
// `arrayMerge: (_, source) => source`, so a bare `{ fields: [conditionalGroup] }`
// WIPES the block's own name/label/required/options fields. Spread them back in.
const withConditional = (slug: keyof typeof defaultFormFields) => ({
  fields: [...(defaultFormFields[slug] as { fields: unknown[] }).fields, conditionalGroup],
})

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  // No client in this repository uses GraphQL. Keep the smaller REST surface.
  graphQL: { disable: true },
  admin: {
    user: Users.slug,
    components: {
      beforeNavLinks: ['@/components/payload/AdminQuickLinks#AdminQuickLinks'],
    },
  },
  collections: [
    Users,
    Events,
    Groups,
    Registrations,
    FormAssignments,
    Attendings,
    TeamMembers,
    Tags,
    FeatureRequests,
  ],
  globals: [HomeContent, TermsContent, SiteSettings],
  editor: lexicalEditor({}),
  // Preflights the whole required set, not just this one variable, and returns
  // PAYLOAD_SECRET. See libs/env.ts for why the others only warn.
  secret: assertAppEnv(),
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    /*
      This project uses migrations, so dev push has to be off.

      `push` defaults to true in development: on every `next dev` the adapter
      diffs the config against the live schema and applies the difference
      directly. It is a schema tool with no concept of data — it will happily
      drop a table to make the shapes match, and it does not run the backfills a
      migration carries. It did exactly that here, dropping `locations`,
      `academic_titles` and `users_interests` before the tags migration had a
      chance to copy them across.

      With push off, `next dev` reports pending migrations instead of applying
      its own guesses, and the only thing that changes the schema is
      `pnpm run db:migrate`.
    */
    push: false,
    pool: {
      connectionString: (() => {
        const uri = process.env.DATABASE_URL
        if (!uri) {
          throw new Error(
            '❌ DATABASE_URL is not set.\n' +
            '   Set DATABASE_URL in your .env file.'
          )
        }
        return uri
      })(),
    },
  }),
  sharp,
  plugins: [
    formBuilderPlugin({
      fields: {
        // Vanilla fields — add conditionalGroup to each so conditional logic works on all types
        text: withConditional('text'),
        textarea: withConditional('textarea'),
        select: withConditional('select'),
        radio: withConditional('radio'),
        number: withConditional('number'),
        email: withConditional('email'),
        checkbox: withConditional('checkbox'),
        date: withConditional('date'),
        message: withConditional('message'),
        state: false,
        country: false,
        payment: false,
        // Custom blocks (already include conditionalGroup internally)
        slider: SliderBlock,
        ranking: RankingBlock,
        checkboxGroup: CheckboxGroupBlock,
        userProfile: UserProfileBlock,
      } as any,
      formOverrides: {
        access: {
          read: () => true,
          create: ({ req: { user } }) => hasPermission(user as User, 'manage_forms'),
          update: ({ req: { user } }) => hasPermission(user as User, 'manage_forms'),
          delete: ({ req: { user } }) => hasPermission(user as User, 'manage_forms'),
        },
        admin: {
          group: 'Forms',
          components: {
            beforeListTable: ['@/components/payload/CollectionImportLink#CollectionImportLink'],
            views: {
              edit: {
                submissions: {
                  path: '/submissions',
                  Component: '@/components/payload/FormResponsesTab#FormResponsesTab',
                  tab: {
                    label: 'Submissions',
                    href: '/submissions',
                    order: 300,
                  },
                },
              },
            },
          },
        },
        fields: ({ defaultFields }) => {
          // Separate fields into tabs for better UX
          // defaultFields: title, fields (blocks), submitButtonLabel, confirmationType,
          //                confirmationMessage, redirect (group), emails (array)
          const titleField = defaultFields.find((f: any) => f.name === 'title')
          const fieldsBlock = defaultFields.find((f: any) => f.name === 'fields')
          const submitLabel = defaultFields.find((f: any) => f.name === 'submitButtonLabel')
          const confirmationType = defaultFields.find((f: any) => f.name === 'confirmationType')
          const confirmationMessage = defaultFields.find((f: any) => f.name === 'confirmationMessage')
          const redirect = defaultFields.find((f: any) => f.name === 'redirect')
          const emails = defaultFields.find((f: any) => f.name === 'emails') as any

          // The plugin defaults this field to any authenticated user. It holds
          // recipient, CC and BCC addresses, so public form reads must omit it.
          if (emails) {
            emails.access = {
              ...emails.access,
              read: ({ req: { user } }: any) => hasPermission(user as User, 'manage_forms'),
            }
          }

          return [
            // Title stays at the top, always visible
            titleField,
            {
              type: 'tabs' as const,
              tabs: [
                {
                  label: 'Fields',
                  description: 'Build your form by adding fields below.',
                  fields: [
                    fieldsBlock,
                    submitLabel,
                  ].filter(Boolean),
                },
                {
                  label: 'Settings & Email',
                  description: 'Configure submission behavior and email notifications.',
                  fields: [
                    confirmationType,
                    confirmationMessage,
                    redirect,
                    emails,
                  ].filter(Boolean),
                },
                {
                  label: 'Response Acceptance',
                  description: 'Manage assignment completion and response acceptance for this form.',
                  fields: [
                    {
                      name: 'accept_responses',
                      type: 'checkbox',
                      label: 'Accept Responses',
                      defaultValue: true,
                      admin: {
                        description: 'Toggle whether this form is currently accepting new responses.',
                      },
                    },
                    {
                      name: 'response_deadline',
                      type: 'date',
                      label: 'Response Deadline',
                      admin: {
                        description: 'Automatically close form after this date and time (optional).',
                        date: {
                          pickerAppearance: 'dayAndTime',
                          timeIntervals: 10,
                        },
                      },
                    },
                    {
                      name: 'response_limit',
                      type: 'number',
                      label: 'Response Limit',
                      admin: {
                        description: 'Automatically close form after this many submissions (optional).',
                      },
                    },
                    {
                      name: 'publish',
                      type: 'group',
                      label: 'Submission Policy',
                      fields: [
                        {
                          name: 'allow_multiple_submissions',
                          type: 'checkbox',
                          label: 'Allow Multiple Submissions',
                          defaultValue: false,
                        },
                      ],
                    },
                    {
                      name: 'closed_message',
                      type: 'richText',
                      label: 'Closed Message',
                      admin: {
                        description: 'Message to show when the form is closed (either manually or past deadline).',
                      },
                    },
                    {
                      name: 'responseAcceptanceManager',
                      type: 'ui' as const,
                      admin: {
                        components: {
                          Field: '@/components/payload/FormResponseAcceptanceTab#FormResponseAcceptanceTab',
                        },
                      },
                    },
                  ],
                },
              ],
            },
          ].filter(Boolean) as any[]
        },
      },
      beforeEmail: (emails, context) => {
        // @ts-ignore
        if (context?.form?.disableConfirmationEmail) {
          return []
        }
        return emails
      },
      formSubmissionOverrides: {
        access: formSubmissionAccess,
        admin: {
          group: 'Forms',
          components: {
            beforeListTable: ['@/components/payload/CollectionImportLink#CollectionImportLink'],
          },
        },
        fields: ({ defaultFields }) => [
          ...defaultFields,
          {
            name: 'user',
            type: 'relationship',
            relationTo: 'users',
            admin: { readOnly: true },
          },
          {
            name: 'single_submission_key',
            type: 'text',
            unique: true,
            admin: { hidden: true },
          },
        ],
        hooks: {
          beforeChange: [
            async ({ req, data, operation }) => {
              // Automatically assign logged-in user to submission
              if (req.user) {
                data.user = req.user.id
              }

              // Enforce form openings and quotas
              if (operation === 'create' && data.form) {
                const formId = typeof data.form === 'object' ? data.form.id : data.form
                const form = await req.payload.findByID({
                  collection: 'forms',
                  id: formId,
                })

                if (form) {
                  const userId = typeof data.user === 'object' ? data.user.id : data.user
                  if (userId && form.publish?.allow_multiple_submissions !== true) {
                    data.single_submission_key = `${formId}:${userId}`
                    const existing = await req.payload.find({
                      collection: 'form-submissions',
                      where: { and: [{ form: { equals: formId } }, { user: { equals: userId } }] },
                      limit: 1,
                    })
                    if (existing.totalDocs > 0) throw new Error('You have already submitted this form.')
                  } else {
                    data.single_submission_key = null
                  }

                  if (form.accept_responses === false) {
                    throw new Error('This form is no longer accepting responses.')
                  }
                  if (form.response_deadline && new Date() > new Date(form.response_deadline)) {
                    throw new Error('The deadline for this form has passed.')
                  }

                  // Quota check
                  const payloadForm = form as any
                  if (typeof payloadForm.response_limit === 'number' && payloadForm.response_limit > 0) {
                    const submissionCount = await req.payload.count({
                      collection: 'form-submissions',
                      where: {
                        form: { equals: formId }
                      }
                    })

                    if (submissionCount.totalDocs >= payloadForm.response_limit) {
                      throw new Error('This form has reached its maximum number of responses.')
                    }
                  }
                }
              }

              return data
            },
          ],
          afterChange: [
            async ({ req, doc, operation }) => {
              if (operation === 'create' && doc.user && doc.form) {
                const userId = typeof doc.user === 'object' ? doc.user.id : doc.user
                const formId = typeof doc.form === 'object' ? doc.form.id : doc.form

                // Find assignment for this user and form
                const assignments = await req.payload.find({
                  collection: 'form-assignments',
                  req,
                  where: {
                    and: [
                      { user: { equals: userId } },
                      { form: { equals: formId } },
                      { completed: { equals: false } },
                    ]
                  }
                })

                // Mark as completed
                if (assignments.totalDocs > 0) {
                  await Promise.all(assignments.docs.map(assignment =>
                    req.payload.update({
                      collection: 'form-assignments',
                      id: assignment.id,
                      req,
                      data: {
                        completed: true,
                      }
                    })
                  ))
                }

                // PHASE 2E: If this form is an event's LOA form, auto-decline the user
                try {
                  const eventsWithLoa = await req.payload.find({
                    collection: 'events',
                    req,
                    where: { loa_form: { equals: formId } },
                    limit: 10,
                  })

                  for (const event of eventsWithLoa.docs) {
                    const regs = await req.payload.find({
                      collection: 'registrations',
                      req,
                      where: {
                        and: [
                          { event: { equals: event.id } },
                          { user: { equals: userId } },
                          { status: { in: ['accepted', 'confirmed'] } },
                        ],
                      },
                    })
                    for (const reg of regs.docs) {
                      await req.payload.update({
                        collection: 'registrations',
                        id: reg.id,
                        req,
                        data: { status: 'declined' },
                      })
                      req.payload.logger.info(`[LOA] Auto-declined registration ${reg.id} for user ${userId}`)
                    }
                  }
                } catch (err) {
                  req.payload.logger.error(`[LOA] Error processing auto-decline: ${err}`)
                }
              }
            }
          ]
        },
      },
    }),
  ],
  email: resendAdapter({
    defaultFromName: 'SurgSoc Mahidol',
    defaultFromAddress: process.env.EMAIL_FROM || 'noreply@surgsoc.mahidol.edu',
    apiKey: process.env.RESEND_API_KEY || '',
  }),
})
