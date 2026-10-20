import { getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'
import { canManageEvent, eventDays } from '@/libs/event-workflow'
import { loadEventApplicants } from '@/libs/event-applicants'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const event = await payload.findByID({ collection: 'events', id, depth: 2 }).catch(() => null)
  if (!event || !canManageEvent(user, event)) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const days = event.event_structure === 'multi_day' ? await eventDays(payload, event.id, true) : []
  return Response.json({ applicants: await loadEventApplicants(payload, event, event.event_structure === 'multi_day' ? days.map(day => day.id) : [event.id]), participantLimit: event.participant_limit || 0, days: days.map(day => ({ id: day.id, name: day.name })) })
}
