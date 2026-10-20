'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'
import { hasPermission } from '@/libs/permissions'
import { validateFormDefinition } from '@/libs/forms/validation'
import { revalidatePath } from 'next/cache'
import { mutationErrorMessage } from '@/libs/utils'

export async function saveForm(id: number | null, input: Record<string, unknown>) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!hasPermission(user, 'manage_forms')) throw new Error('You cannot manage forms.')
  const allowed = ['title', 'fields', 'submitButtonLabel', 'accept_responses', 'response_deadline', 'response_limit', 'publish', 'confirmationMessage', 'confirmationType', 'redirect']
  const data = Object.fromEntries(allowed.filter(key => Object.hasOwn(input, key)).map(key => [key, input[key]]))
  // Do not let nested publish metadata carry arbitrary client settings.
  if (data.publish) {
    const publish = data.publish as any
    data.publish = { allow_multiple_submissions: publish.allow_multiple_submissions === true, ...(publish.closed_message && typeof publish.closed_message === 'object' ? { closed_message: publish.closed_message } : {}) }
  }
  if (data.confirmationType !== undefined && !['message', 'redirect'].includes(String(data.confirmationType))) throw new Error('Choose what members see after sending.')
  if (data.confirmationType === 'redirect') {
    const url = String((data.redirect as any)?.url ?? '').trim()
    if (!/^(\/(?!\/)|https?:\/\/)/.test(url)) throw new Error('Enter a link that starts with / or https://.')
    data.redirect = { url }
  }
  validateFormDefinition(data)
  let form
  try { form = id ? await payload.update({ collection: 'forms', id, data, user: user!, overrideAccess: false }) : await payload.create({ collection: 'forms', data: data as any, user: user!, overrideAccess: false }) }
  catch (error) { payload.logger.error({ err: error, msg: 'Form save failed' }); throw new Error(mutationErrorMessage(error, 'Could not save the form. Check required fields. / บันทึกแบบฟอร์มไม่สำเร็จ กรุณาตรวจสอบข้อมูล')) }
  revalidatePath('/[locale]/forms', 'layout')
  return form.id
}

export async function setAcceptResponses(id: number, accept: boolean) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!hasPermission(user, 'manage_forms')) throw new Error('You cannot manage forms.')
  try { await payload.update({ collection: 'forms', id, data: { accept_responses: accept }, user: user!, overrideAccess: false }) }
  catch (error) { payload.logger.error({ err: error, msg: 'Form toggle failed' }); throw new Error(mutationErrorMessage(error, 'Could not save. / บันทึกไม่สำเร็จ')) }
  revalidatePath('/[locale]/forms', 'layout')
}

// Payload regenerates row ids, so a copy must not carry the originals.
const withoutIds = (value: unknown): unknown => Array.isArray(value) ? value.map(withoutIds)
  : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'id').map(([key, v]) => [key, withoutIds(v)]))
  : value

/* A copy of a form's questions and settings, closed to responses until staff are ready. Responses and assignments stay with the original. */
export async function duplicateForm(id: number, copyLabel: string) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!hasPermission(user, 'manage_forms')) throw new Error('You cannot manage forms.')
  const source = await payload.findByID({ collection: 'forms', id, user: user!, overrideAccess: false, depth: 0 })
  const data = {
    ...Object.fromEntries(['fields', 'submitButtonLabel', 'confirmationMessage', 'confirmationType', 'redirect', 'response_limit', 'publish'].filter(key => (source as any)[key] != null).map(key => [key, withoutIds((source as any)[key])])),
    title: `${copyLabel} ${source.title}`.slice(0, 200),
    accept_responses: false,
  }
  validateFormDefinition(data as any)
  try {
    const copy = await payload.create({ collection: 'forms', data: data as any, user: user!, overrideAccess: false })
    revalidatePath('/[locale]/forms', 'layout')
    return copy.id
  } catch (error) { payload.logger.error({ err: error, msg: 'Form duplicate failed' }); throw new Error(mutationErrorMessage(error, 'Could not duplicate the form. / คัดลอกแบบฟอร์มไม่สำเร็จ')) }
}

/* A form can go only when nothing uses it and nobody has answered it, so no member's record or an event's setup loses its form. */
export async function deleteForm(id: number) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!hasPermission(user, 'manage_forms')) throw new Error('You cannot manage forms.')
  await payload.findByID({ collection: 'forms', id, user: user!, overrideAccess: false, depth: 0 })
  const [answers, assignments, events] = await Promise.all([
    payload.count({ collection: 'form-submissions', where: { form: { equals: id } } }),
    payload.count({ collection: 'form-assignments', where: { form: { equals: id } } }),
    payload.count({ collection: 'events', where: { or: [{ subscription_form: { equals: id } }, { loa_form: { equals: id } }, { reflection_form: { equals: id } }] } }),
  ])
  if (answers.totalDocs || assignments.totalDocs || events.totalDocs) throw new Error('This form is used by an event or already has responses. Stop accepting responses instead.')
  try { await payload.delete({ collection: 'forms', id, user: user!, overrideAccess: false }) }
  catch (error) { payload.logger.error({ err: error, msg: 'Form delete failed' }); throw new Error(mutationErrorMessage(error, 'Could not delete the form. / ลบแบบฟอร์มไม่สำเร็จ')) }
  revalidatePath('/[locale]/forms', 'layout')
}
