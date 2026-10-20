import type { CollectionBeforeChangeHook, CollectionBeforeDeleteHook } from 'payload'
import { idOf } from './form-assignment-lifecycle'
import { hasPermission } from './permissions'
import { lockEvent } from './event-workflow'

export const validateEvent: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req }) => {
  const event = { ...originalDoc, ...data }
  if (operation === 'create' && req.user) data.owner = req.user.id
  if (operation === 'update' && req.user && !hasPermission(req.user, 'manage_events')) {
    // Payload hydrates unchanged relationship fields before this hook. Compare values, not presence.
    const relationKey = (value: any) => String(idOf(value) ?? '')
    for (const field of ['owner', 'coordinator']) if (Object.hasOwn(data, field) && relationKey(data[field]) !== relationKey(originalDoc?.[field])) throw new Error('Only event managers can change event ownership or groups.')
    const groupKeys = (values: any) => (values || []).map(relationKey).sort().join(',')
    if (Object.hasOwn(data, 'groups') && groupKeys(data.groups) !== groupKeys(originalDoc?.groups)) throw new Error('Only event managers can change event ownership or groups.')
  }
  const begin = Date.parse(event.date_begin)
  const end = event.date_end ? Date.parse(event.date_end) : begin
  if (!Number.isFinite(begin) || !Number.isFinite(end) || end < begin) throw new Error('Event dates are invalid.')
  for (const field of ['participant_limit', 'max_waiting_list']) if (event[field] != null && (!Number.isInteger(event[field]) || event[field] < 0)) throw new Error('Capacity limits must be nonnegative integers.')
  const parentId = idOf(event.parent_event)
  if ((event.event_structure === 'day') !== !!parentId) throw new Error('Only day events have a parent, and every day needs one.')
  if (parentId) {
    if (String(parentId) === String(originalDoc?.id)) throw new Error('An event cannot be its own parent.')
    if (await req.transactionID) await lockEvent(req.payload, parentId, req)
    const parent = await req.payload.findByID({ collection: 'events', id: parentId, depth: 0, req })
    if (parent.event_structure !== 'multi_day' || begin < Date.parse(parent.date_begin) || end > Date.parse(parent.date_end || parent.date_begin)) throw new Error('Days must fall within a multi-day parent event.')
  }
  if (operation === 'update') {
    if (await req.transactionID) await lockEvent(req.payload, originalDoc.id, req)
    const structural = (event.event_structure || 'standalone') !== (originalDoc.event_structure || 'standalone') || String(parentId) !== String(idOf(originalDoc.parent_event))
    if (structural) {
      const registrations = await req.payload.count({ collection: 'registrations', where: { or: [{ event: { equals: originalDoc.id } }, { 'event.parent_event': { equals: originalDoc.id } }] }, req })
      const applications = await req.payload.count({ collection: 'form-submissions', where: { application_event: { equals: originalDoc.id } }, req })
      if (registrations.totalDocs || applications.totalDocs) throw new Error('Events with applications cannot be restructured or reparented.')
    }
    const children = await req.payload.find({ collection: 'events', where: { parent_event: { equals: originalDoc.id } }, depth: 0, pagination: false, req })
    if (children.docs.length && (event.event_structure !== 'multi_day' || children.docs.some(day => Date.parse(day.date_begin) < begin || Date.parse(day.date_end || day.date_begin) > end))) throw new Error('Keep all days within their parent event range.')
  }
  const reflection = idOf(event.reflection_form)
  if (reflection) {
    if (!event.reflection_deadline) throw new Error('A reflection assignment deadline is required.')
    const release = Date.parse(event.reflection_release_at || event.date_end || event.date_begin)
    if (!Number.isFinite(Date.parse(event.reflection_deadline)) || Date.parse(event.reflection_deadline) < release) throw new Error('Reflection deadline must follow its release time.')
    const duplicates = await req.payload.count({ collection: 'events', where: { and: [{ reflection_form: { equals: reflection } }, ...(operation === 'update' ? [{ id: { not_equals: originalDoc.id } }] : [])] }, req })
    if (duplicates.totalDocs) throw new Error('Separate event reflections need distinct forms.')
  }
  return data
}

export const preventEventDeletion: CollectionBeforeDeleteHook = async ({ id, req }) => {
  if (await req.transactionID) await lockEvent(req.payload, id, req)
  const children = await req.payload.count({ collection: 'events', where: { parent_event: { equals: id } }, req })
  const registrations = await req.payload.count({ collection: 'registrations', where: { event: { equals: id } }, req })
  const applications = await req.payload.count({ collection: 'form-submissions', where: { application_event: { equals: id } }, req })
  if (children.totalDocs || registrations.totalDocs || applications.totalDocs) throw new Error('Close or hide events with days or application history instead of deleting them.')
}
