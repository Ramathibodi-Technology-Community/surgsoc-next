import { lockEvent, promoteWaitingList, queueRegistrationNotification } from '../libs/event-workflow'
import { SEATED_STATUSES } from '../libs/applicant-status'
import { isCanonicalApplication } from '../libs/event-applicants'

import { CollectionConfig, Where } from 'payload'
import { hasPermission } from '../libs/permissions'
import type { User } from '../payload-types'
import { cancelDormantEventReflection, reconcileEventReflection, idOf } from '../libs/form-assignment-lifecycle'

export const Registrations: CollectionConfig = {
  slug: 'registrations',
  // One registration per member per event; closes the find-then-create race.
  indexes: [{ fields: ['event', 'user'], unique: true }],
  admin: {
    useAsTitle: 'id',
    group: 'Management',
    defaultColumns: ['id', 'event', 'user', 'status', 'selected_at'],
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
        delete data.event
        delete data.submission
        delete data.session_submission
        delete data.rejection_reason
        delete data.user
        delete data.status
        return data
      },
      async ({ data, originalDoc, req }) => {
        const eventId = idOf(data.event ?? originalDoc?.event)
        if (!eventId) throw new Error('An event is required.')
        let event = await req.payload.findByID({ collection: 'events', id: eventId, depth: 0, req })
        const parentId = idOf(event.parent_event)
        if (parentId) await lockEvent(req.payload, parentId, req)
        await lockEvent(req.payload, eventId, req)
        event = await req.payload.findByID({ collection: 'events', id: eventId, depth: 0, req })
        if (String(idOf(event.parent_event)) !== String(parentId)) throw new Error('The event parent changed. Reload before updating registrations.')
        if (event.event_structure === 'multi_day') throw new Error('Register for a day, not the parent event.')
        const submissionId = idOf(data.submission ?? originalDoc?.submission)
        const terminating = !!originalDoc?.id && ['withdrawn', 'declined', 'rejected'].includes(data.status) && ['event', 'user', 'submission'].every(field => !Object.hasOwn(data, field) || String(idOf(data[field])) === String(idOf(originalDoc[field])))
        if (SEATED_STATUSES.includes(data.status) && data.status !== originalDoc?.status && !submissionId) throw new Error('A canonical application response is required before acceptance.')
        if (submissionId && !terminating) {
          const submission = await req.payload.findByID({ collection: 'form-submissions', id: submissionId, depth: 0, req })
          const parent = parentId ? await req.payload.findByID({ collection: 'events', id: parentId, depth: 0, req }) : event
          if (!isCanonicalApplication(submission, idOf(data.user ?? originalDoc?.user), parent)) throw new Error('Registration submission linkage is invalid.')
          const reused = await req.payload.find({ collection: 'registrations', where: { and: [{ submission: { equals: submissionId } }, ...(originalDoc ? [{ id: { not_equals: originalDoc.id } }] : [])] }, depth: 1, pagination: false, req })
          if (reused.docs.some(row => !parentId || typeof row.event !== 'object' || String(idOf(row.event.parent_event)) !== String(parentId) || String(idOf(row.user)) !== String(idOf(data.user ?? originalDoc?.user)))) throw new Error('A submission can only be shared within one member’s multi-day event.')
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req, req: { payload } }) => {
        // Status changed?
        if (doc.status === previousDoc?.status) return

        const event = await payload.findByID({ collection: 'events', id: idOf(doc.event)!, depth: 1, req })
        await queueRegistrationNotification(payload, doc, req)
        if (doc.status === 'confirmed') await reconcileEventReflection(payload, event, undefined, 'automatic_event', req)
        else if (previousDoc?.status === 'confirmed') await cancelDormantEventReflection(payload, event.id, idOf(doc.user)!, req)
        const parentId = idOf(event.parent_event)
        if (parentId) {
          const parent = await payload.findByID({ collection: 'events', id: parentId, depth: 0, req })
          await reconcileEventReflection(payload, parent, undefined, 'automatic_event', req)
          if (previousDoc?.status === 'confirmed' && doc.status !== 'confirmed') {
            const remaining = await payload.count({ collection: 'registrations', where: { and: [{ user: { equals: idOf(doc.user) } }, { 'event.parent_event': { equals: parentId } }, { status: { equals: 'confirmed' } }] }, req })
            if (!remaining.totalDocs) await cancelDormantEventReflection(payload, parentId, idOf(doc.user)!, req)
          }
        }
        if (SEATED_STATUSES.includes(previousDoc?.status) && !SEATED_STATUSES.includes(doc.status)) await promoteWaitingList(payload, event, req)
      },
    ],
  },
  access: {
    read: ({ req: { user } }) => {
       if (!user) return false
       if (hasPermission(user as User, 'manage_events')) return true
       return { or: [{ user: { equals: user.id } }, { 'event.owner': { equals: user.id } }, { 'event.parent_event.owner': { equals: user.id } }] } as Where
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
      // Extra answers to the session's own form (the common answers live on `submission`).
      name: 'session_submission',
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
