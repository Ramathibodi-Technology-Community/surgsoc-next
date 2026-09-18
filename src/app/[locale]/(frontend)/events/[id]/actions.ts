'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'
import { checkUserActionGate } from '@/libs/user-action-gate'
import { getErrorMessage } from '@/libs/utils'

export async function confirmAttendance(eventId: string) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return { success: false, message: 'Not authenticated' }

  // Find user's registration for this event
  const regs = await payload.find({
    collection: 'registrations',
    where: {
      and: [
        { event: { equals: eventId } },
        { user: { equals: user.id } },
        { status: { equals: 'accepted' } }, // Can only confirm if accepted
      ],
    },
  })

  if (regs.totalDocs === 0) {
    return { success: false, message: 'No accepted registration found.' }
  }

  await payload.update({
    collection: 'registrations',
    id: regs.docs[0].id,
    data: { status: 'confirmed' },
  })

  return { success: true, message: 'Attendance confirmed!' }
}

export async function declineAttendance(eventId: string) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return { success: false, message: 'Not authenticated' }

  const regs = await payload.find({
    collection: 'registrations',
    where: {
      and: [
        { event: { equals: eventId } },
        { user: { equals: user.id } },
        { status: { in: ['accepted', 'confirmed'] } }, // Can decline if accepted or confirmed (via LOA technically) here we just set status
      ],
    },
  })

  if (regs.totalDocs === 0) {
    return { success: false, message: 'No active registration found.' }
  }

  await payload.update({
    collection: 'registrations',
    id: regs.docs[0].id,
    data: { status: 'declined' },
  })

  return { success: true, message: 'Registration declined.' }
}

/**
 * Apply to an event: creates the form submission AND the registration, or neither.
 * Called from the event's apply page instead of the generic `submitForm`, which
 * only ever wrote a form-submission and left no registration behind.
 */
export async function submitEventApplication(
  eventId: string | number,
  data: Record<string, unknown>,
) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  const event = await payload.findByID({ collection: 'events', id: eventId })
  if (!event) throw new Error('Event not found.')

  const formId =
    typeof event.subscription_form === 'object'
      ? event.subscription_form?.id
      : event.subscription_form
  if (!formId) throw new Error('This event has no registration form.')

  const gate = await checkUserActionGate(payload, user, {
    resource: event as any,
  })
  if (!gate.allowed) throw new Error(gate.message)

  const existing = await payload.find({
    collection: 'registrations',
    where: {
      and: [{ event: { equals: eventId } }, { user: { equals: user!.id } }],
    },
    limit: 1,
  })
  if (existing.totalDocs > 0) throw new Error('You have already applied to this event.')

  // Both writes land together or not at all.
  const transactionID = (await payload.db.beginTransaction()) ?? undefined
  const req = transactionID ? ({ transactionID } as any) : undefined

  try {
    const submission = await payload.create({
      collection: 'form-submissions',
      data: {
        form: Number(formId),
        submissionData: Object.entries(data).map(([field, value]) => ({
          field,
          value: String(value),
        })),
        user: user!.id,
      },
      req,
    })

    await payload.create({
      collection: 'registrations',
      data: {
        event: Number(eventId),
        user: user!.id,
        status: 'applicant',
        submission: submission.id,
      },
      req,
    })

    if (transactionID) await payload.db.commitTransaction(transactionID)
  } catch (error) {
    if (transactionID) await payload.db.rollbackTransaction(transactionID)
    console.error(`Error submitting event application: ${getErrorMessage(error)}`)
    throw new Error('Failed to submit registration')
  }
}
