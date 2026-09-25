'use server'

import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { canAssignForms } from '@/libs/permissions'

export async function releaseReflectionNow(eventId: string | number) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!canAssignForms(user as any)) throw new Error('Only VP, President, or superadmin can release reflection forms.')

  const event = await payload.findByID({ collection: 'events', id: eventId, depth: 0 }) as any
  if (!event.reflection_form || !event.reflection_deadline) {
    throw new Error('Choose a reflection form and deadline before releasing it.')
  }
  const now = new Date().toISOString()
  await payload.update({
    collection: 'events', id: eventId, overrideAccess: true,
    data: {
      reflection_release_at: now,
      reflection_released_early_at: now,
      reflection_released_early_by: user!.id,
    },
    context: { assignmentSource: 'early_release' },
  })
}
