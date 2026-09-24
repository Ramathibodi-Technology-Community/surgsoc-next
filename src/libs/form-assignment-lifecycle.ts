import type { Payload } from 'payload'
import { ensureAcademicTermTag } from './academic-term'

type Id = string | number
type Relation = Id | { id: Id } | null | undefined

export type AssignmentKind = 'event_reflection' | 'annual_survey'
export type AssignmentSource = 'automatic_event' | 'annual_policy' | 'early_release' | 'manual_reconcile'

export const MEMBER_ROLES = ['member', 'staff_probation', 'staff', 'deputy_vp', 'vp', 'admin', 'superadmin']

export function idOf(value: Relation): Id | null {
  if (typeof value === 'string' || typeof value === 'number') return value
  return value?.id ?? null
}

export function assignmentState(assignment: { completed?: boolean | null; cancelled_at?: string | null; active_at?: string | null; deadline?: string | null }, now = new Date()) {
  if (assignment.completed) return 'complete'
  if (assignment.cancelled_at) return 'cancelled'
  if (assignment.active_at && new Date(assignment.active_at) > now) return 'dormant'
  if (assignment.deadline && new Date(assignment.deadline) <= now) return 'overdue'
  return 'pending'
}

export function isBlockingAssignment(assignment: Parameters<typeof assignmentState>[0], now = new Date()) {
  return assignmentState(assignment, now) === 'overdue'
}

/**
 * Runs `fn` over `items` with at most `limit` in flight at once — a plain
 * loop serializes hundreds of round trips (an annual survey reconciling
 * every member), unbounded `Promise.all` can blow past the DB's free-tier
 * connection cap (Neon: 20, Supabase: 60). No `p-limit` dependency for this.
 */
async function mapWithConcurrency<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let index = 0
  const worker = async () => {
    while (index < items.length) {
      const item = items[index++]
      await fn(item)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
}

type EnsureInput = {
  form: Id
  users: Id[]
  kind: AssignmentKind
  source: AssignmentSource
  deadline: string
  activeAt?: string | null
  sourceEvent?: Id | null
  surveyAcademicYear?: Id | null
  assignedBy?: Id | null
  req?: any
}

export async function ensureFormAssignments(payload: Payload, input: EnsureInput) {
  const users = [...new Map(input.users.map((user) => [String(user), user])).values()]
  if (users.length === 0) return { created: 0, existing: 0, failed: 0 }
  const existing = await payload.find({
    collection: 'form-assignments',
    where: { and: [{ form: { equals: input.form } }, { user: { in: users } }] },
    limit: 0,
    depth: 0,
    overrideAccess: true,
    req: input.req,
  })
  const byUser = new Map(existing.docs.map((doc: any) => [String(idOf(doc.user)), doc]))
  let created = 0
  let alreadyExisting = 0
  let failed = 0
  await mapWithConcurrency(users, 10, async (user) => {
    const old = byUser.get(String(user))
    if (old) {
      alreadyExisting++
      if (old.cancelled_at || !old.kind || !old.source) {
        await payload.update({
          collection: 'form-assignments', id: old.id, overrideAccess: true, req: input.req,
          data: {
            cancelled_at: null,
            ...(input.activeAt ? { active_at: input.activeAt } : {}),
            deadline: input.deadline,
            kind: input.kind,
            source: input.source,
            source_event: input.sourceEvent ?? undefined,
            survey_academic_year: input.surveyAcademicYear ?? undefined,
            blocks_registration: true,
          } as any,
        })
      }
      return
    }
    try {
      await payload.create({
        collection: 'form-assignments',
        overrideAccess: true,
        req: input.req,
        data: {
          form: input.form, user, assigned_by: input.assignedBy ?? undefined,
          kind: input.kind, source: input.source, deadline: input.deadline,
          ...(input.activeAt ? { active_at: input.activeAt } : {}), source_event: input.sourceEvent ?? undefined,
          survey_academic_year: input.surveyAcademicYear ?? undefined,
          completed: false, blocks_registration: true,
        } as any,
      })
      created++
    } catch (error) {
      const raced = await payload.find({
        collection: 'form-assignments',
        where: { and: [{ form: { equals: input.form } }, { user: { equals: user } }] },
        limit: 1, depth: 0, overrideAccess: true, req: input.req,
      })
      if (raced.totalDocs > 0) alreadyExisting++
      else {
        failed++
        payload.logger.error(`[FormAssignment] Could not assign form ${input.form} to user ${user}: ${error}`)
      }
    }
  })
  return { created, existing: alreadyExisting, failed }
}

export async function reconcileEventReflection(payload: Payload, event: any, assignedBy?: Id | null, source: AssignmentSource = 'automatic_event', req?: any) {
  const form = idOf(event.reflection_form)
  if (!form || !event.reflection_deadline) return { created: 0, existing: 0, failed: 0 }
  const confirmed = await payload.find({
    collection: 'registrations',
    where: { and: [{ event: { equals: event.id } }, { status: { equals: 'confirmed' } }] },
    limit: 0, depth: 0, overrideAccess: true, req,
  })
  return ensureFormAssignments(payload, {
    form, users: confirmed.docs.map((registration: any) => idOf(registration.user)).filter((id): id is Id => id !== null),
    kind: 'event_reflection', source, deadline: event.reflection_deadline,
    activeAt: event.reflection_release_at || event.date_end || event.date_begin,
    sourceEvent: event.id, assignedBy, req,
  })
}

export async function cancelDormantEventReflection(payload: Payload, eventId: Id, userId: Id, req?: any) {
  const assignments = await payload.find({
    collection: 'form-assignments',
    where: { and: [
      { kind: { equals: 'event_reflection' } }, { source_event: { equals: eventId } },
      { user: { equals: userId } }, { completed: { equals: false } },
      { active_at: { greater_than: new Date().toISOString() } },
    ] },
    limit: 0, depth: 0, overrideAccess: true, req,
  })
  await Promise.all(assignments.docs.map((assignment: any) => payload.update({
    collection: 'form-assignments', id: assignment.id, overrideAccess: true, req,
    data: { cancelled_at: new Date().toISOString() },
  })))
}

// Soft-cancels every non-completed annual_survey assignment for this form's
// current term — mirrors cancelDormantEventReflection. Completed rows are
// left alone so the audit trail (who actually submitted) survives.
export async function cancelAnnualSurvey(payload: Payload, formId: Id, req?: any) {
  const assignments = await payload.find({
    collection: 'form-assignments',
    where: { and: [
      { form: { equals: formId } }, { kind: { equals: 'annual_survey' } },
      { completed: { equals: false } }, { cancelled_at: { equals: null } },
    ] },
    limit: 0, depth: 0, overrideAccess: true, req,
  })
  await Promise.all(assignments.docs.map((assignment: any) => payload.update({
    collection: 'form-assignments', id: assignment.id, overrideAccess: true, req,
    data: { cancelled_at: new Date().toISOString() },
  })))
  return { cancelled: assignments.docs.length }
}

export async function currentAcademicYear(payload: Payload, now = new Date(), req?: any) {
  return ensureAcademicTermTag(payload, now, req)
}

export async function reconcileAnnualSurvey(payload: Payload, form: any, users?: Id[], assignedBy?: Id | null, req?: any) {
  if (!form.annual_survey_enabled || !form.survey_academic_year || !form.survey_deadline) return { created: 0, existing: 0, failed: 0 }
  const year = await currentAcademicYear(payload, new Date(), req)
  if (!year || String(year.id) !== String(idOf(form.survey_academic_year))) return { created: 0, existing: 0, failed: 0 }
  const memberIds = users ?? (await payload.find({ collection: 'users', where: { roles: { in: MEMBER_ROLES } }, limit: 0, depth: 0, overrideAccess: true, req })).docs.map((user: any) => user.id)
  return ensureFormAssignments(payload, {
    form: form.id, users: memberIds, kind: 'annual_survey', source: 'annual_policy',
    deadline: form.survey_deadline, activeAt: form.survey_activation_at || null,
    surveyAcademicYear: year.id, assignedBy, req,
  })
}

export async function reconcileAnnualSurveysForUser(payload: Payload, user: any, req?: any) {
  if (!user?.roles?.some((role: string) => MEMBER_ROLES.includes(role))) return []
  const year = await currentAcademicYear(payload, new Date(), req)
  if (!year) return []
  const forms = await payload.find({
    collection: 'forms',
    where: { and: [{ annual_survey_enabled: { equals: true } }, { survey_academic_year: { equals: year.id } }] },
    limit: 0, depth: 0, overrideAccess: true, req,
  })
  return Promise.all(forms.docs.map((form: any) => reconcileAnnualSurvey(payload, form, [user.id], undefined, req)))
}
