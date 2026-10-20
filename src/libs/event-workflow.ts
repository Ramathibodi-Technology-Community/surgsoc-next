import type { Payload, PayloadRequest, Where } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import type { Event, User } from '@/payload-types'
import { canAssignForms, hasPermission } from './permissions'
import { idOf } from './form-assignment-lifecycle'
import { SEATED_STATUSES } from './applicant-status'
import { NotificationService } from './notifications'
import { tagPath } from './tags'
import { isCanonicalApplication } from './event-applicants'

export const publicEventWhere: Where = {
  and: [
    { is_visible: { equals: true } },
    { or: [{ parent_event: { exists: false } }, { 'parent_event.is_visible': { equals: true } }] },
  ],
}
export const topLevelEventWhere: Where = { parent_event: { exists: false } }

export function canManageEvent(user: User | null | undefined, event: Pick<Event, 'owner'> & { parent_event?: unknown }) {
  if (!user) return false
  if (hasPermission(user, 'manage_events') || String(idOf(event.owner)) === String(user.id)) return true
  const parent = event.parent_event
  return !!parent && typeof parent === 'object' && 'owner' in parent && String(idOf((parent as Event).owner)) === String(user.id)
}

/** Event settings (people, exports, advanced) are experimental: owner, coordinator, and VPs and above only. */
export function canSeeEventSettings(user: User | null | undefined, event: Pick<Event, 'owner' | 'coordinator'>) {
  if (!user) return false
  return canAssignForms(user) || String(idOf(event.owner)) === String(user.id) || String(idOf(event.coordinator)) === String(user.id)
}

export function eventListPeriod(now: string, past = false): Where {
  return past
    ? { or: [{ date_end: { less_than: now } }, { and: [{ date_end: { exists: false } }, { date_begin: { less_than: now } }] }] }
    : { or: [{ date_end: { greater_than_equal: now } }, { and: [{ date_end: { exists: false } }, { date_begin: { greater_than_equal: now } }] }] }
}

export async function visibleEvent(payload: Payload, id: string | number, user?: User | null) {
  const event = await payload.findByID({ collection: 'events', id, depth: 2 }).catch(() => null)
  if (!event) return null
  if (canManageEvent(user, event)) return event
  if (event.is_visible === false) return null
  const parentId = idOf(event.parent_event)
  if (parentId) {
    const parent = await payload.findByID({ collection: 'events', id: parentId, depth: 0 }).catch(() => null)
    if (!parent || parent.is_visible === false) return null
  }
  return event
}

export async function eventDays(payload: Payload, parentId: string | number, includeHidden = false, req?: PayloadRequest) {
  const result = await payload.find({
    collection: 'events', where: { and: [{ parent_event: { equals: parentId } }, ...(includeHidden ? [] : [publicEventWhere])] },
    sort: 'date_begin', pagination: false, depth: 2, req,
  })
  return result.docs
}

export async function inEventTransaction<T>(payload: Payload, fn: (req: PayloadRequest) => Promise<T>) {
  const transactionID = await payload.db.beginTransaction()
  if (!transactionID) throw new Error('Registration transactions are unavailable. Please try again later.')
  const req = { transactionID, context: {}, payload } as PayloadRequest
  try {
    const result = await fn(req)
    await payload.db.commitTransaction(transactionID)
    return result
  } catch (error) {
    await payload.db.rollbackTransaction(transactionID)
    throw error
  }
}

export async function lockEvent(payload: Payload, id: string | number, req: Pick<PayloadRequest, 'transactionID'>) {
  if (!Number.isInteger(Number(id)) || Number(id) <= 0) throw new Error('Invalid event ID.')
  const transactionID = await req.transactionID
  const session = transactionID && payload.db.sessions?.[transactionID]
  if (!session) throw new Error('An active registration transaction is required.')
  await (session.db as { execute: (query: ReturnType<typeof sql>) => Promise<unknown> }).execute(sql`SELECT id FROM events WHERE id = ${Number(id)} FOR UPDATE`)
}

export async function initialRegistrationStatus(payload: Payload, event: Event, req: PayloadRequest) {
  if (event.registration_selection_mode === 'manual' || !event.registration_selection_mode) return 'applicant' as const
  const seated = await payload.count({ collection: 'registrations', where: { and: [{ event: { equals: event.id } }, { status: { in: SEATED_STATUSES } }] }, req })
  if (!event.participant_limit || seated.totalDocs < event.participant_limit) return event.registration_selection_mode
  const waiting = await payload.count({ collection: 'registrations', where: { and: [{ event: { equals: event.id } }, { status: { equals: 'subscribed' } }] }, req })
  if (event.max_waiting_list && waiting.totalDocs >= event.max_waiting_list) throw new Error(`${event.name}: the waiting list is full.`)
  return 'subscribed' as const
}

export async function promoteWaitingList(payload: Payload, event: Event, req: PayloadRequest) {
  if ((event.registration_selection_mode !== 'accepted' && event.registration_selection_mode !== 'confirmed') || new Date(event.date_begin).getTime() <= Date.now()) return
  await lockEvent(payload, event.id, req)
  const parentId = idOf(event.parent_event)
  const parent = parentId ? await payload.findByID({ collection: 'events', id: parentId, depth: 0, req }) : event
  while (true) {
    const seated = await payload.count({ collection: 'registrations', where: { and: [{ event: { equals: event.id } }, { status: { in: SEATED_STATUSES } }] }, req })
    if (event.participant_limit && seated.totalDocs >= event.participant_limit) return
    // ponytail: linear waiting-list scan; paginate if lists grow beyond normal event sizes.
    const waiting = await payload.find({ collection: 'registrations', where: { and: [{ event: { equals: event.id } }, { status: { equals: 'subscribed' } }] }, sort: ['createdAt', 'id'], pagination: false, depth: 0, req })
    let next
    for (const row of waiting.docs) {
      const submissionId = idOf(row.submission)
      const submission = submissionId ? await payload.findByID({ collection: 'form-submissions', id: submissionId, depth: 0, req }).catch(() => null) : null
      if (isCanonicalApplication(submission, idOf(row.user), parent)) { next = row; break }
    }
    if (!next) return
    await payload.update({ collection: 'registrations', id: next.id, data: { status: event.registration_selection_mode }, req })
  }
}

/** Payload/Drizzle commits via session.resolve; queue mail on that commit, never afterChange. */
export async function queueRegistrationNotification(payload: Payload, registration: any, req: PayloadRequest) {
  if (req.context?.skipNotifications || !['accepted', 'confirmed', 'rejected'].includes(registration.status)) return
  const send = async () => {
    try {
      // The adapter can swallow a commit error. Verify the write persisted before mailing.
      const saved = await payload.findByID({ collection: 'registrations', id: registration.id, depth: 0 })
      if (saved.status !== registration.status || saved.updatedAt !== registration.updatedAt) return
      const event = await payload.findByID({ collection: 'events', id: idOf(registration.event)!, depth: 2 })
      const user = await payload.findByID({ collection: 'users', id: idOf(registration.user)! })
      const args = { registration, event: { ...event, location: tagPath(event.location) }, user }
      if (registration.status === 'accepted') await NotificationService.sendRegistrationAccepted(args)
      if (registration.status === 'confirmed') await NotificationService.sendRegistrationConfirmed(args)
      if (registration.status === 'rejected') await NotificationService.sendRegistrationRejected(args)
    } catch (error) {
      payload.logger.error({ err: error, msg: `Registration ${registration.id}: notification failed after commit` })
    }
  }
  const transactionID = await req.transactionID
  const session = transactionID && payload.db.sessions?.[transactionID]
  if (!session) throw new Error('Registration notifications require a transaction.')
  const queued = session as typeof session & { registrationMail?: Map<string, () => Promise<void>> }
  if (!queued.registrationMail) {
    queued.registrationMail = new Map()
    const resolve = queued.resolve
    queued.resolve = async () => {
      await resolve()
      for (const notification of queued.registrationMail!.values()) await notification()
    }
  }
  queued.registrationMail.set(String(registration.id), send)
}
