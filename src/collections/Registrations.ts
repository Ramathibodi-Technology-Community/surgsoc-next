
import { CollectionConfig } from 'payload'
import { NotificationService } from '../libs/notifications'
import { hasPermission } from '../libs/permissions'
import type { User } from '../payload-types'

export const Registrations: CollectionConfig = {
  slug: 'registrations',
  // One registration per member per event; closes the find-then-create race.
  indexes: [{ fields: ['event', 'user'], unique: true }],
  admin: {
    useAsTitle: 'id',
    group: 'Management',
    components: {
      beforeListTable: ['@/components/payload/CollectionImportLink#CollectionImportLink'],
    },
  },
  hooks: {
    beforeChange: [
      // Members may edit their own registration (e.g. LOA fields) but never its
      // status, owner or selection audit. Creation is manage_events-only (access.create);
      // members apply through submitEventApplication's Local API call.
      ({ req, data }) => {
        if (!req.user || hasPermission(req.user as User, 'manage_events')) return data
        delete data.selected_by
        delete data.selected_at
        delete data.user
        delete data.status
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

          It gates the emails only. Form-assignment updates still run because
          those are data the records genuinely need.
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
    create: ({ req: { user } }) => hasPermission(user as User, 'manage_events'),
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
