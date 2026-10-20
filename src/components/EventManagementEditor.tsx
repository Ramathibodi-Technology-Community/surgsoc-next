import type { Locale } from '@/i18n/config'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/libs/auth/current-user'
import { notFound, redirect } from 'next/navigation'
import { hasPermission, canAssignForms } from '@/libs/permissions'
import { canManageEvent, eventDays } from '@/libs/event-workflow'
import { findTags } from '@/libs/tags'
import EventEditor from './EventEditor'
import PageHeader from './PageHeader'
import { getDictionary } from '@/i18n/server'
import { idOf } from '@/libs/form-assignment-lifecycle'

export default async function EventManagementEditor({ id, parentId, locale }: { id?: string; parentId?: string; locale: Locale }) {
  const payload = await getPayload({ config })
  const user = await getCurrentUser(payload)
  if (!user) redirect('/login')
  const event = id ? await payload.findByID({ collection: 'events', id, depth: 2, user, overrideAccess: true }).catch(() => null) : null
  if (id ? !event || !canManageEvent(user, event) : !hasPermission(user, 'manage_events')) notFound()
  const [forms, parents, eventTypes, departments, locations] = await Promise.all([
    payload.find({ collection: 'forms', pagination: false, depth: 0, overrideAccess: false, user }),
    payload.find({ collection: 'events', where: { event_structure: { equals: 'multi_day' } }, depth: 0, pagination: false }),
    findTags(payload, 'event_type'), findTags(payload, 'department'), findTags(payload, 'location'),
  ])
  const relationshipAccess = hasPermission(user, 'manage_events')
  const [people, groups] = relationshipAccess ? await Promise.all([
    payload.find({ collection: 'users', depth: 0, pagination: false, select: { name_english: true, name_thai: true } }),
    payload.find({ collection: 'groups', depth: 0, pagination: false, select: { name: true } }),
  ]) : [{ docs: [] }, { docs: [] }]
  const days = event?.event_structure === 'multi_day' ? await eventDays(payload, event.id, true) : []
  // Pass editor-owned data only, never populated users or private form-routing metadata.
  const editable = event ? Object.fromEntries(['id', 'name', 'event_structure', 'parent_event', 'event_type', 'department', 'date_begin', 'date_end', 'location', 'image_url', 'description', 'is_visible', 'subscription_form', 'registration_opens_at', 'registration_closes_at', 'participant_limit', 'max_waiting_list', 'registration_selection_mode', 'status_override', 'is_registration_closed', 'custom_acceptance_email', 'loa_form', 'participant_detail', 'owner', 'coordinator', 'reflection_form', 'reflection_release_at', 'reflection_deadline'].map(key => [key, (event as any)[key]])) : {}
  for (const field of ['parent_event', 'subscription_form', 'reflection_form', 'owner', 'coordinator', 'event_type', 'department', 'location', 'loa_form']) editable[field] = idOf(editable[field] as any)
  editable.groups = event?.groups?.map(group => idOf(group)) || []
  if (!relationshipAccess) for (const key of ['owner', 'coordinator', 'groups']) delete editable[key]
  if (!id && parentId) {
    const parent = parents.docs.find(parent => String(parent.id) === parentId)
    if (!parent || !canManageEvent(user, parent)) notFound()
    Object.assign(editable, { event_structure: 'day', parent_event: parent.id, event_type: idOf(parent.event_type), date_begin: parent.date_begin })
  }
  const formOptions = forms.docs.map(form => ({ id: form.id, title: form.title, fields: form.fields, submitButtonLabel: form.submitButtonLabel }))
  const t = (await getDictionary(locale)).events
  return <><PageHeader title={event?.name || t.new_event} /><EventEditor event={editable} forms={formOptions} parents={parents.docs.filter(parent => canManageEvent(user, parent)).map(parent => ({ id: parent.id, name: parent.name }))} tags={{ event_type: eventTypes, department: departments, location: locations }} assignmentAccess={canAssignForms(user)} relationshipAccess={relationshipAccess} formAccess={hasPermission(user, 'manage_forms')} people={people.docs.map(person => ({ id: person.id, name: [person.name_english?.first_name, person.name_english?.last_name].filter(Boolean).join(' ') || [person.name_thai?.first_name, person.name_thai?.last_name].filter(Boolean).join(' ') || String(person.id) }))} groups={groups.docs.map(group => ({ id: group.id, name: group.name }))} /></>
}
