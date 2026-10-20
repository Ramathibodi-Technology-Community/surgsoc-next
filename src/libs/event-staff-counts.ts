import type { Payload } from 'payload'
import { assignmentState } from '@/libs/form-assignment-lifecycle'

/* Numbers for the staff tab badges: only counts that answer "what is waiting on me?" (design.md § Section tabs). */
export async function staffTabCounts(payload: Payload, eventIds: number[]) {
  const [pending, applied, reflections] = await Promise.all([
    payload.count({ collection: 'registrations', where: { and: [{ event: { in: eventIds } }, { status: { equals: 'applicant' } }] } }),
    payload.count({ collection: 'registrations', where: { event: { in: eventIds } } }),
    payload.find({ collection: 'form-assignments', where: { and: [{ source_event: { in: eventIds } }, { kind: { equals: 'event_reflection' } }] }, pagination: false, depth: 0, select: { completed: true, cancelled_at: true, active_at: true, deadline: true } }),
  ])
  return {
    pending: pending.totalDocs,
    applied: applied.totalDocs,
    overdue: reflections.docs.filter(row => assignmentState(row) === 'overdue').length,
  }
}
