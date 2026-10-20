'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { canAssignForms, hasPermission } from '@/libs/permissions'
import { canManageEvent, inEventTransaction, initialRegistrationStatus, lockEvent } from '@/libs/event-workflow'
import { idOf } from '@/libs/form-assignment-lifecycle'
import { mutationErrorMessage } from '@/libs/utils'

export async function saveEvent(id: number | null, input: Record<string, unknown>) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) throw new Error('Sign in to manage events.')
  const event = id ? await payload.findByID({ collection: 'events', id, depth: 2 }) : null
  if (event ? !canManageEvent(user, event) : !hasPermission(user, 'manage_events')) throw new Error('You cannot manage this event.')
  const fields = ['name', 'event_structure', 'parent_event', 'event_type', 'department', 'date_begin', 'date_end', 'location', 'image_url', 'description', 'is_visible', 'subscription_form', 'registration_opens_at', 'registration_closes_at', 'participant_limit', 'max_waiting_list', 'registration_selection_mode', 'status_override', 'is_registration_closed', 'custom_acceptance_email', 'loa_form', 'participant_detail']
  if (hasPermission(user, 'manage_events')) fields.push('coordinator', 'groups', ...(id ? ['owner'] : []))
  if (canAssignForms(user)) fields.push('reflection_form', 'reflection_release_at', 'reflection_deadline')
  const data: Record<string, any> = {}
  for (const key of fields) if (Object.hasOwn(input, key)) data[key] = input[key]
  for (const key of ['event_type', 'department', 'location', 'parent_event', 'subscription_form', 'reflection_form', 'loa_form', 'owner', 'coordinator']) if (Object.hasOwn(data, key)) data[key] = idOf(data[key])
  if (Object.hasOwn(data, 'groups')) {
    if (!Array.isArray(data.groups) || data.groups.some((value: unknown) => !Number.isSafeInteger(value) || Number(value) <= 0)) throw new Error('Choose valid event groups.')
    data.groups = [...new Set(data.groups)]
  }
  let saved
  try { saved = id ? await payload.update({ collection: 'events', id, data, user, overrideAccess: false }) : await payload.create({ collection: 'events', data: data as any, user, overrideAccess: false }) }
  catch (error) { payload.logger.error({ err: error, msg: 'Event save failed' }); throw new Error(mutationErrorMessage(error, 'Could not save the event. Check required fields and reload. / บันทึกกิจกรรมไม่สำเร็จ กรุณาตรวจสอบข้อมูล')) }
  revalidatePath('/[locale]/events', 'layout')
  return saved.id
}

export async function saveGalleryLinks(eventId: number, links: { title: string; url: string }[]) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  const event = user ? await payload.findByID({ collection: 'events', id: eventId, depth: 2 }).catch(() => null) : null
  if (!user || !event || !canManageEvent(user, event)) throw new Error('You cannot manage this event.')
  const clean = links.map(link => ({ title: link.title.trim(), url: link.url.trim() })).filter(link => link.title && link.url)
  if (clean.length > 50 || clean.some(link => !/^https?:\/\//i.test(link.url))) throw new Error('Photo links must start with http:// or https://')
  await payload.update({ collection: 'events', id: eventId, data: { gallery_links: clean }, user, overrideAccess: false })
  revalidatePath('/[locale]/events', 'layout')
}

export async function addApplicationDay(parentId: number, submissionId: number, dayId: number) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) throw new Error('Sign in to manage events.')
  if (![parentId, submissionId, dayId].every(value => Number.isSafeInteger(value) && value > 0)) throw new Error('Choose a valid application and day.')
  let parent = await payload.findByID({ collection: 'events', id: parentId, depth: 2 })
  if (!canManageEvent(user, parent)) throw new Error('You cannot manage this event.')
  try { await inEventTransaction(payload, async req => {
    await lockEvent(payload, parentId, req)
    parent = await payload.findByID({ collection: 'events', id: parentId, depth: 2, req })
    if (!canManageEvent(user, parent)) throw new Error('You cannot manage this event.')
    await lockEvent(payload, dayId, req)
    const day = await payload.findByID({ collection: 'events', id: dayId, depth: 0, req })
    const submission = await payload.findByID({ collection: 'form-submissions', id: submissionId, depth: 0, req })
    if (String(idOf(day.parent_event)) !== String(parentId) || String(idOf(submission.application_event)) !== String(parentId) || String(idOf(submission.form)) !== String(idOf(parent.subscription_form)) || !idOf(submission.user) || Date.parse(day.date_begin) <= Date.now()) throw new Error('Choose an original application and an upcoming day belonging to this parent.')
    const status = await initialRegistrationStatus(payload, day, req)
    await payload.create({ collection: 'registrations', data: { event: dayId, user: Number(idOf(submission.user)), submission: submissionId, status, selected_at: new Date().toISOString(), selected_by: user!.id }, req })
  }) } catch (error) {
    payload.logger.error({ err: error, msg: 'Adding application day failed' })
    throw new Error(mutationErrorMessage(error, 'Could not add this day. Check capacity and existing registrations. / เพิ่มวันไม่สำเร็จ กรุณาตรวจสอบที่นั่งและการสมัครเดิม'))
  }
  revalidatePath('/[locale]/events', 'layout')
}

const COPY_FIELDS = ['event_structure', 'event_type', 'department', 'date_begin', 'date_end', 'location', 'image_url', 'description', 'subscription_form', 'registration_opens_at', 'registration_closes_at', 'participant_limit', 'max_waiting_list', 'registration_selection_mode', 'status_override', 'custom_acceptance_email', 'loa_form', 'participant_detail'] as const

/* A new hidden draft with the same basics, sessions and application form. Applicants and registrations stay behind. The reflection form is left unset: each event needs its own (validateEvent). */
export async function duplicateEvent(id: number, copyLabel: string) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) throw new Error('Sign in to manage events.')
  const source = await payload.findByID({ collection: 'events', id, depth: 0 })
  if (!canManageEvent(user, source)) throw new Error('You cannot manage this event.')
  if (source.parent_event) throw new Error('Copy the whole event group, not one session.')
  const pick = (doc: Record<string, any>) => Object.fromEntries(COPY_FIELDS.filter(key => doc[key] != null).map(key => [key, idOf(doc[key]) ?? doc[key]]))
  try {
    const copy = await payload.create({ collection: 'events', data: { ...pick(source), name: `${copyLabel} ${source.name}`.slice(0, 200), is_visible: false } as any, user, overrideAccess: false })
    const days = await payload.find({ collection: 'events', where: { parent_event: { equals: id } }, sort: 'date_begin', pagination: false, depth: 0 })
    for (const day of days.docs) await payload.create({ collection: 'events', data: { ...pick(day), name: day.name, parent_event: copy.id, is_visible: false, subscription_form: null, registration_opens_at: null, registration_closes_at: null } as any, user, overrideAccess: false })
    revalidatePath('/[locale]/events', 'layout')
    return copy.id
  } catch (error) { payload.logger.error({ err: error, msg: 'Event duplicate failed' }); throw new Error(mutationErrorMessage(error, 'Could not copy the event. / คัดลอกกิจกรรมไม่สำเร็จ')) }
}

/* Only while nothing has been applied for; otherwise hide it (preventEventDeletion is the backstop). */
export async function deleteEvent(id: number) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) throw new Error('Sign in to manage events.')
  const event = await payload.findByID({ collection: 'events', id, depth: 0 })
  if (!canManageEvent(user, event)) throw new Error('You cannot manage this event.')
  try { await payload.delete({ collection: 'events', id, user, overrideAccess: false }) }
  catch (error) { payload.logger.error({ err: error, msg: 'Event delete failed' }); throw new Error(mutationErrorMessage(error, 'This event has days or applications. Switch off Published instead. / กิจกรรมนี้มีรอบหรือผู้สมัครแล้ว ให้ปิดการเผยแพร่แทน')) }
  revalidatePath('/[locale]/events', 'layout')
}
