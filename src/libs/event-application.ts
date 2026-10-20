import type { Payload } from 'payload'
import type { Event, User } from '@/payload-types'
import { checkUserActionGate } from './user-action-gate'
import { idOf } from './form-assignment-lifecycle'
import { ResourceScheduling, registrationCutoff } from './resource-scheduling'
import { eventDays, inEventTransaction, initialRegistrationStatus, lockEvent, visibleEvent } from './event-workflow'

/** A session runs its own window; one it leaves blank follows the group. A group switched closed closes every session. */
export function sessionRegistration(day: Event, parent: Event) {
  const status_override = parent.status_override === 'closed' || day.status_override === 'closed' ? 'closed' : day.status_override ?? parent.status_override
  const opens = day.registration_opens_at ?? parent.registration_opens_at
  const closes = registrationCutoff(day.date_end || day.date_begin, day.registration_closes_at ?? parent.registration_closes_at)
  const { isOpen } = ResourceScheduling.isOpen({ opens_at: opens, closes_at: closes, status_override: status_override as 'auto' | 'open' | 'closed' | null })
  return { isOpen, opens, closes, extraForm: idOf(day.subscription_form) }
}

export async function applyToEvent(payload: Payload, user: User | null, eventId: string | number, data: Record<string, unknown>, selectedDayIds?: (string | number)[], sessionData: Record<string, Record<string, unknown>> = {}) {
  const event = await visibleEvent(payload, eventId, user)
  if (!event || event.event_structure === 'day') throw new Error('Apply through the parent event.')
  const formId = idOf(event.subscription_form)
  if (!formId) throw new Error('This event has no registration form.')
  const multiDay = event.event_structure === 'multi_day'
  // A group is gated per session below; the group itself only needs the member to be eligible.
  const gate = await checkUserActionGate(payload, user, multiDay ? undefined : { resource: event })
  if (!gate.allowed) throw new Error(gate.message)
  const ids = multiDay ? selectedDayIds : [event.id]
  if (!ids?.length || ids.some(id => !Number.isInteger(Number(id)) || Number(id) <= 0) || new Set(ids.map(String)).size !== ids.length || ids.length > 366) throw new Error('Select at least one valid day, without duplicates.')
  await inEventTransaction(payload, async req => {
    req.context.eventApplication = true
    await lockEvent(payload, event.id, req)
    // Read again after taking the lock: visibility, form and window may have changed.
    const current = await payload.findByID({ collection: 'events', id: event.id, depth: 0, req })
    const currentGate = await checkUserActionGate(payload, user, multiDay ? undefined : { resource: current })
    if (current.is_visible === false || !currentGate.allowed || String(idOf(current.subscription_form)) !== String(formId)) throw new Error('Registration settings have changed. Reload the application.')
    const days = multiDay ? await eventDays(payload, event.id, false, req) : [current]
    const targets = ids.map(id => days.find(day => String(day.id) === String(id)))
    if (targets.some(day => !day || day.is_visible === false || (multiDay && Date.parse(day.date_begin) <= Date.now()))) throw new Error('One of the selected days is unavailable.')
    const ordered = targets.filter(day => !!day).sort((a, b) => a.id - b.id)
    if (multiDay) for (const day of ordered) if (!sessionRegistration(day, current).isOpen) throw new Error(`${day.name}: registration is not open.`)
    // A session the member left can be taken up again: its row is reopened rather than duplicated.
    const mine = multiDay ? await payload.find({ collection: 'registrations', where: { and: [{ 'event.parent_event': { equals: event.id } }, { user: { equals: user!.id } }] }, depth: 0, pagination: false, req }) : null
    const reopenable = ['withdrawn', 'declined']
    if (mine) {
      if (mine.docs.some(row => ordered.some(day => String(idOf(row.event)) === String(day.id)) && !reopenable.includes(row.status || ''))) throw new Error('You have already applied to this event.')
    } else {
      const existing = await payload.count({ collection: 'form-submissions', where: { and: [{ application_event: { equals: event.id } }, { user: { equals: user!.id } }] }, req })
      const registrations = await payload.count({ collection: 'registrations', where: { and: [{ event: { equals: event.id } }, { user: { equals: user!.id } }] }, req })
      if (existing.totalDocs || registrations.totalDocs) throw new Error('You have already applied to this event.')
    }
    for (const day of ordered) await lockEvent(payload, day.id, req)
    // Adding sessions later reuses the answers already on file instead of asking again.
    const onFile = multiDay ? await payload.find({ collection: 'form-submissions', where: { and: [{ application_event: { equals: event.id } }, { user: { equals: user!.id } }] }, limit: 1, depth: 0, req }) : null
    const pack = (values: Record<string, unknown>) => Object.entries(values).map(([field, value]) => ({ field, value: Array.isArray(value) ? JSON.stringify(value) : String(value ?? '') }))
    let submission = onFile?.docs[0]
    if (!submission) submission = await payload.create({ collection: 'form-submissions', data: {
      form: Number(formId), user: user!.id, application_event: event.id,
      selected_days: multiDay ? ordered.map(day => day.id) : null,
      submissionData: pack(data),
    }, req })
    for (const day of ordered) {
      const extra = multiDay ? idOf(day.subscription_form) : null
      req.context.sessionAnswers = true
      const extraSubmission = extra ? await payload.create({ collection: 'form-submissions', data: { form: Number(extra), user: user!.id, application_event: day.id, submissionData: pack(sessionData[String(day.id)] ?? {}) }, req }) : null
      req.context.sessionAnswers = false
      const status = await initialRegistrationStatus(payload, day, req)
      const prior = mine?.docs.find(row => String(idOf(row.event)) === String(day.id))
      const fields = { status, submission: submission.id, ...(extraSubmission ? { session_submission: extraSubmission.id } : {}) }
      if (prior) await payload.update({ collection: 'registrations', id: prior.id, data: fields, req })
      else await payload.create({ collection: 'registrations', data: { event: day.id, user: user!.id, ...fields }, req })
    }
  })
}
