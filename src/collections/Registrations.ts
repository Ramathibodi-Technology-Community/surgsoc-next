
import { CollectionConfig } from 'payload'
import { NotificationService } from '../libs/notifications'
import { canInteractAsMember, hasPermission } from '../libs/permissions'
import { checkUserActionGate } from '../libs/user-action-gate'
import type { User } from '../payload-types'

export const Registrations: CollectionConfig = {
  slug: 'registrations',
  admin: {
    useAsTitle: 'id',
    group: 'Management',
    components: {
      beforeListTable: ['@/components/payload/CollectionImportLink#CollectionImportLink'],
    },
  },
  hooks: {
    beforeChange: [
      // REST/API defence: an authenticated non-manager may only create their own
      // application and may never move status or the selection audit fields.
      // Local API calls (server actions) run with overrideAccess and no req.user,
      // so the legitimate confirm/decline flows are untouched.
      ({ req, data, operation }) => {
        if (!req.user || hasPermission(req.user as User, 'manage_events')) return data

        delete data.selected_by
        delete data.selected_at

        if (operation === 'create') {
          data.user = req.user.id
          data.status = 'applicant'
        } else {
          delete data.user
          delete data.status
        }

        return data
      },
      // REST/GraphQL defence: `submitEventApplication` runs `checkUserActionGate`
      // (profile complete, no blocking forms, event window open) plus a duplicate
      // check before creating a registration — but Payload auto-exposes this
      // collection at /api/registrations and /api/graphql, so those rules must
      // also live here or a direct POST bypasses all of them. Same skip
      // condition as the guard above: managers and Local API callers (no
      // req.user) are exempt so the admin panel and confirm/decline/auto-promote
      // flows keep working.
      async ({ req, data, operation }) => {
        if (!req.user || hasPermission(req.user as User, 'manage_events')) return data
        if (operation !== 'create') return data

        const eventId = typeof data.event === 'object' && data.event !== null ? data.event.id : data.event
        if (!eventId) throw new Error('An event is required to register.')

        const event = await req.payload.findByID({ collection: 'events', id: eventId })
        if (!event) throw new Error('Event not found.')

        const gate = await checkUserActionGate(req.payload, req.user as User, {
          resource: event as any,
        })
        if (!gate.allowed) throw new Error(gate.message)

        const existing = await req.payload.find({
          collection: 'registrations',
          where: {
            and: [{ event: { equals: eventId } }, { user: { equals: req.user.id } }],
          },
          limit: 1,
        })
        if (existing.totalDocs > 0) throw new Error('You have already applied to this event.')

        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req, req: { payload } }) => {
        // Status changed?
        if (doc.status === previousDoc?.status) return

        /*
          Bulk import sets this. On a create `previousDoc` is empty, so the check
          above is always true and every imported row would otherwise fire the
          email for whatever status it carries — a backfill of last term's
          attendance would invite everyone to an event that already happened.

          It gates the emails only. The form-assignment and auto-promote branches
          below still run, because those are data the records genuinely need.
        */
        const notify = req.context?.skipNotifications !== true

        try {
            // Fetch full event and user details if they are IDs
            const event = typeof doc.event === 'string'
                ? await payload.findByID({ collection: 'events', id: doc.event })
                : doc.event

            const user = typeof doc.user === 'string'
                ? await payload.findByID({ collection: 'users', id: doc.user })
                : doc.user

            if (!event || !user) {
                payload.logger.error(`[Notification] Missing event or user for registration ${doc.id}`)
                return
            }

            // 1. Accepted -> Send acceptance email
            if (notify && doc.status === 'accepted') {
                await NotificationService.sendRegistrationAccepted({ registration: doc, event, user })
                payload.logger.info(`[Notification] Sent details to ${user.email}`)
            }

            // 2. Rejected -> Send rejection email
            if (notify && doc.status === 'rejected') {
                await NotificationService.sendRegistrationRejected({ registration: doc, event, user })
                payload.logger.info(`[Notification] Sent rejection to ${user.email}`)
            }

            // 3. Confirmed -> Send confirmation
            if (notify && doc.status === 'confirmed') {
                await NotificationService.sendRegistrationConfirmed({ registration: doc, event, user })
                payload.logger.info(`[Notification] Sent confirmation to ${user.email}`)
            }

            // 4. Post-event lifecycle: assign feedback/reflection form to participants
            if (doc.status === 'participant' && previousDoc?.status !== 'participant') {
              const rawReflectionFormId =
                typeof event.reflection_form === 'object' && event.reflection_form !== null
                  ? event.reflection_form.id
                  : event.reflection_form

              const reflectionFormId =
                rawReflectionFormId == null ? null : Number(rawReflectionFormId)

              if (reflectionFormId != null && Number.isFinite(reflectionFormId)) {
                const existingAssignment = await payload.find({
                  collection: 'form-assignments',
                  where: {
                    and: [
                      { user: { equals: user.id } },
                      { form: { equals: reflectionFormId } },
                    ],
                  },
                  limit: 1,
                })

                if (existingAssignment.totalDocs === 0) {
                  await payload.create({
                    collection: 'form-assignments',
                    data: {
                      user: user.id,
                      form: reflectionFormId,
                      completed: false,
                      blocks_registration: false,
                    },
                  })

                  payload.logger.info(
                    `[FeedbackAssignment] Assigned reflection form ${reflectionFormId} to user ${user.id} for event ${event.id}`,
                  )
                }
              }
            }

            // 5. Auto-promote from waiting list
            // If a user declines or withdraws, and auto-promote is enabled, select the next person
            if (['declined', 'withdrawn'].includes(doc.status)) {
                if (event.auto_promote) {
                    // Find next person on waiting list (oldest first)
                    // Status 'subscribed' maps to waiting list in our logic
                    const waitingList = await payload.find({
                        collection: 'registrations',
                        where: {
                            and: [
                                { event: { equals: event.id } },
                                { status: { equals: 'subscribed' } },
                            ],
                        },
                        sort: 'createdAt',
                        limit: 1,
                    })

                    if (waitingList.docs.length > 0) {
                        const nextUserReg = waitingList.docs[0]
                        await payload.update({
                            collection: 'registrations',
                            id: nextUserReg.id,
                            data: { status: 'accepted' },
                        })
                        payload.logger.info(
                            `[AutoPromote] Promoted registration ${nextUserReg.id} for event ${event.id} after user ${doc.user} declined/withdrew`
                        )
                    }
                }
            }

        } catch (error) {
            payload.logger.error(`[Notification] Error in afterChange hook for registration ${doc.id}: ${error}`)
        }
      },
    ],
  },
  access: {
    read: ({ req: { user } }) => {
       if (!user) return false
       if (hasPermission(user as User, 'manage_events')) return true
       return { user: { equals: user.id } }
    },
    create: ({ req: { user } }) => canInteractAsMember(user as User),
    update: ({ req: { user } }) => {
       if (!user) return false
       if (hasPermission(user as User, 'manage_events')) return true
       // Where-query: only match rows owned by this user
       return { user: { equals: user.id } }
    },
    delete: ({ req: { user } }) => {
       if (!user) return false
       return hasPermission(user as User, 'manage_events')
    },
  },
  fields: [
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      required: true,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      defaultValue: ({ user }: any) => user?.id,
    },
    {
      name: 'status',
      type: 'select',
      options: [
        'subscribed',
        'applicant',      // Default - in applicant pool
        'accepted',       // Selected by organizer
        'rejected',       // Rejected by organizer
        'confirmed',      // User confirmed attendance
        'declined',       // User declined (Leave of Absence)
        'participant',    // Attended event
        'withdrawn',      // User withdrawn
      ],
      defaultValue: 'applicant',
    },
    {
      name: 'submission',
      type: 'relationship',
      relationTo: 'form-submissions',
      admin: { readOnly: true },
    },
    {
      name: 'selected_at',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'selected_by',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'rejection_reason',
      type: 'textarea',
      admin: {
        condition: (data) => data.status === 'rejected',
      },
    },
  ],
}
