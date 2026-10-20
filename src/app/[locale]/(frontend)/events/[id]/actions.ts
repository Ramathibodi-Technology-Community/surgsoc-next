'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { applyToEvent } from '@/libs/event-application'
import { idOf } from '@/libs/form-assignment-lifecycle'
import { inEventTransaction, lockEvent, visibleEvent } from '@/libs/event-workflow'
import { mutationErrorMessage } from '@/libs/utils'

async function changeOwnRegistration(eventId: string, from: string[], status: 'confirmed' | 'declined' | 'withdrawn') {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return { success: false, message: 'Not authenticated' }
  const result = await inEventTransaction(payload, async req => {
    const event = await visibleEvent(payload, eventId, user)
    if (!event) return { success: false, message: 'Event not found.' }
    const parentId = idOf(event.parent_event)
    if (parentId) await lockEvent(payload, parentId, req)
    await lockEvent(payload, eventId, req)
    const registrations = await payload.find({ collection: 'registrations', where: { and: [{ event: { equals: eventId } }, { user: { equals: user.id } }, { status: { in: from } }] }, limit: 1, depth: 0, req })
    if (!registrations.docs[0]) return { success: false, message: 'No eligible registration found.' }
    await payload.update({ collection: 'registrations', id: registrations.docs[0].id, data: { status }, req })
    return { success: true, message: status === 'confirmed' ? 'Attendance confirmed!' : status === 'withdrawn' ? 'Application withdrawn.' : 'Registration declined.' }
  })
  if (result.success) revalidatePath('/[locale]/events', 'layout')
  return result
}

export async function confirmAttendance(eventId: string) { return changeOwnRegistration(eventId, ['accepted'], 'confirmed') }
export async function declineAttendance(eventId: string) { return changeOwnRegistration(eventId, ['accepted', 'confirmed'], 'declined') }
export async function withdrawApplication(eventId: string) { return changeOwnRegistration(eventId, ['applicant', 'subscribed'], 'withdrawn') }

export async function submitEventApplication(eventId: string | number, data: Record<string, unknown>, selectedDayIds?: (string | number)[], sessionData?: Record<string, Record<string, unknown>>) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  try { await applyToEvent(payload, user, eventId, data, selectedDayIds, sessionData) }
  catch (error) { payload.logger.error({ err: error, msg: 'Event application failed' }); throw new Error(mutationErrorMessage(error, 'Could not save the application. Please reload and try again. / บันทึกใบสมัครไม่สำเร็จ กรุณาลองใหม่')) }
  revalidatePath('/[locale]/events', 'layout')
}
