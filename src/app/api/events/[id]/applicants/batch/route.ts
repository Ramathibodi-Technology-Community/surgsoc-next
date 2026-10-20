import { getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'
import { canManageEvent, inEventTransaction, lockEvent } from '@/libs/event-workflow'
import { idOf } from '@/libs/form-assignment-lifecycle'
import { BATCHABLE_STATUSES } from '@/libs/applicant-status'
import { mutationErrorMessage } from '@/libs/utils'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  let body: any
  try { body = await request.json() } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }) }
  if (!body || typeof body !== 'object') return Response.json({ error: 'Invalid request body' }, { status: 400 })
  const { action, registrationIds, rejectionReason = '' } = body
  if (!Array.isArray(registrationIds) || !registrationIds.length || registrationIds.length > 1000 || new Set(registrationIds.map(String)).size !== registrationIds.length) return Response.json({ error: 'registrationIds must be a non-empty unique array' }, { status: 400 })
  if (!['accept', 'reject', 'wait', 'remove'].includes(action) || typeof rejectionReason !== 'string' || rejectionReason.length > 2000) return Response.json({ error: 'Invalid action or rejection reason' }, { status: 400 })
  const event = await payload.findByID({ collection: 'events', id, depth: 2 }).catch(() => null)
  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 })
  if (!canManageEvent(user, event)) return Response.json({ error: 'Forbidden' }, { status: 403 })
  try {
    return await inEventTransaction(payload, async req => {
      const parentId = idOf(event.parent_event)
      if (parentId) await lockEvent(payload, parentId, req)
      await lockEvent(payload, id, req)
      const current = await payload.findByID({ collection: 'events', id, depth: 2, req })
      if (!canManageEvent(user, current)) return Response.json({ error: 'Forbidden' }, { status: 403 })
      const { docs } = await payload.find({ collection: 'registrations', where: { and: [{ id: { in: registrationIds } }, { event: { equals: id } }] }, limit: registrationIds.length, depth: 2, req })
      const found = new Set(docs.map(row => String(row.id)))
      const mismatchedIds = registrationIds.filter((row: unknown) => !found.has(String(row)))
      if (mismatchedIds.length) return Response.json({ error: 'One or more registrations do not belong to this event', mismatchedIds }, { status: 400 })
      const lockedIds = docs.filter(row => action === 'remove' ? !['applicant', 'subscribed', 'accepted', 'confirmed'].includes(row.status || '') : !BATCHABLE_STATUSES.includes(row.status || '')).map(row => row.id)
      if (lockedIds.length) return Response.json({ error: 'One or more registrations can no longer be changed', lockedIds }, { status: 400 })
      if (action === 'accept' && docs.some(row => !row.submission)) return Response.json({ error: 'Missing canonical application response; resolve linkage before acceptance.' }, { status: 400 })
      for (const row of docs) await payload.update({ collection: 'registrations', id: row.id, data: {
        status: action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : action === 'wait' ? 'subscribed' : ['accepted', 'confirmed'].includes(row.status || '') ? 'declined' : 'withdrawn',
        selected_at: new Date().toISOString(), selected_by: user.id,
        ...(action === 'reject' ? { rejection_reason: rejectionReason.trim() || null } : {}),
      }, req })
      return Response.json({ success: true, updated: docs.length, updatedIds: docs.map(row => row.id), failedIds: [] })
    })
  } catch (error) {
    payload.logger.error({ err: error, msg: 'Applicant update failed' })
    return Response.json({ success: false, error: mutationErrorMessage(error, 'Could not update registrations.'), updated: 0 }, { status: 409 })
  }
}
