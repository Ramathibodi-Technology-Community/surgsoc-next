import { eventReturnPath } from '@/libs/utils'
import { formManager } from '@/libs/form-management'
import { notFound } from 'next/navigation'
import FormEditor, { type FormTab } from './FormEditor'
import { PROFILE_FIELDS } from '@/libs/forms/validation'
import { canAssignForms } from '@/libs/permissions'
import { getNestedValue } from '@/libs/forms/prefillUserData'

export default async function FormManagementEditor({ id, returnTo, tab }: { id?: string; returnTo?: string; tab?: string }) {
  const { payload, user } = await formManager()
  const form = id ? await payload.findByID({ collection: 'forms', id, overrideAccess: false, user, depth: 0 }).catch(() => null) : null
  if (id && !form) notFound()
  const editable = form ? Object.fromEntries(['id', 'title', 'fields', 'submitButtonLabel', 'accept_responses', 'response_deadline', 'response_limit', 'publish', 'confirmationMessage', 'confirmationType', 'redirect'].map(key => [key, (form as any)[key]])) : null
  const usedBy = id ? (await payload.find({ collection: 'events', where: { or: [{ subscription_form: { equals: id } }, { loa_form: { equals: id } }, { reflection_form: { equals: id } }] }, depth: 0, pagination: false, select: { name: true } })).docs.map(event => ({ id: event.id, name: event.name })) : []
  const owner = id ? await payload.findByID({ collection: 'forms', id, depth: 1, overrideAccess: false, user }).then(doc => (typeof doc.owner === 'object' && doc.owner ? doc.owner.email : undefined)).catch(() => undefined) : undefined
  const responses = id ? await payload.count({ collection: 'form-submissions', where: { form: { equals: id } }, user, overrideAccess: false }) : null
  const profile: Record<string, any> = {}
  for (const path of PROFILE_FIELDS) {
    const keys = path.split('.')
    if (keys.length === 1) profile[path] = getNestedValue(user, path)
    else { profile[keys[0]] ||= {}; profile[keys[0]][keys[1]] = getNestedValue(user, path) }
  }
  const current: FormTab = tab === 'after' || tab === 'availability' || tab === 'settings' ? tab : 'questions'
  return <FormEditor form={editable} user={profile} returnTo={eventReturnPath(returnTo)} tab={current} responseCount={responses?.totalDocs ?? 0} canAssign={canAssignForms(user)} usedBy={usedBy} ownerEmail={owner} />
}
