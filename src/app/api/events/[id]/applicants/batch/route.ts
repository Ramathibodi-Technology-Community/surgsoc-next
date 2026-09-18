import { getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'
import { hasPermission } from '@/libs/permissions'
import type { User } from '@/payload-types'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const payload = await getPayload({ config })
  const headersList = await headers()
  const { user } = await payload.auth({ headers: headersList })

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { action, registrationIds } = await request.json()

  if (!Array.isArray(registrationIds) || registrationIds.length === 0) {
    return Response.json({ error: 'registrationIds must be a non-empty array' }, { status: 400 })
  }

  if (action !== 'accept' && action !== 'reject') {
    return Response.json({ error: 'Invalid action' }, { status: 400 })
  }

  // Verify user has permission to manage this event
  const event = await payload.findByID({
    collection: 'events',
    id,
  })

  const ownerId = typeof event.owner === 'object' ? event.owner?.id : event.owner
  const isAuthorized =
    ownerId === user.id ||
    hasPermission(user as User, 'manage_events')

  if (!isAuthorized) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Scope registrations to THIS event — reject the batch if any ID belongs elsewhere
  const { docs: scopedRegistrations } = await payload.find({
    collection: 'registrations',
    where: {
      and: [
        { id: { in: registrationIds } },
        { event: { equals: id } },
      ],
    },
    limit: registrationIds.length,
    depth: 0,
  })

  const scopedIds = new Set(scopedRegistrations.map((r) => String(r.id)))
  const mismatchedIds = registrationIds.filter((r) => !scopedIds.has(String(r)))
  if (mismatchedIds.length > 0) {
    return Response.json(
      {
        error: 'One or more registrations do not belong to this event',
        mismatchedIds,
      },
      { status: 400 },
    )
  }

  // Batch update registrations (loop to ensure per-doc afterChange hooks fire)
  const newStatus = action === 'accept' ? 'accepted' : 'rejected'
  const updatedIds: Array<string | number> = []
  const failedIds: Array<{ id: string | number; error: string }> = []

  for (const regId of scopedRegistrations.map((r) => r.id)) {
    try {
      await payload.update({
        collection: 'registrations',
        id: regId,
        data: {
          status: newStatus,
          selected_at: new Date(),
          selected_by: user.id,
        } as any,
      })
      updatedIds.push(regId)
    } catch (e) {
      payload.logger.error(`Failed to update registration ${regId}: ${(e as Error).message}`)
      failedIds.push({ id: regId, error: (e as Error).message })
    }
  }

  return Response.json({
    success: failedIds.length === 0,
    updated: updatedIds.length,
    updatedIds,
    failedIds,
  })
}
