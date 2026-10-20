import { canManageEvent, canSeeEventSettings, eventDays } from '@/libs/event-workflow'
import { loadEventApplicants } from '@/libs/event-applicants'
import EventOperationsOverview from '@/components/EventOperationsOverview'
import { StaffDayAdjustment } from '@/components/StaffDayAdjustment'
import React from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/libs/auth/current-user'
import { redirect } from 'next/navigation'
import StaffShell from '@/components/events/StaffShell'
import { staffTabCounts } from '@/libs/event-staff-counts'
import { canAssignForms } from '@/libs/permissions'
import ApplicantPoolManager from '@/components/ApplicantPoolManager'
import GroupApplicantsTable, { type GroupApplicant } from '@/components/GroupApplicantsTable'
import { SEATED_STATUSES } from '@/libs/applicant-status'
import { answerFields } from '@/libs/forms/answers'
import { idOf } from '@/libs/form-assignment-lifecycle'
import { getDictionary } from '@/i18n/server'
import { Locale } from '@/i18n/config'

export default async function ApplicantsPage({ params }: { params: Promise<{ id: string, locale: string }> }) {
  const { id, locale } = await params as { id: string, locale: Locale }
  const t = (await getDictionary(locale)).events

  const payload = await getPayload({ config })
  const user = await getCurrentUser(payload)

  if (!user) {
    redirect('/login')
  }

  // Fetch event
  const event = await payload.findByID({
    collection: 'events',
    id,
  })

  if (!canManageEvent(user, event)) redirect(`/events/${id}`)
  const days = event.event_structure === 'multi_day' ? await eventDays(payload, event.id, true) : []
  const participantLimit =
    typeof (event as { participant_limit?: unknown }).participant_limit === 'number'
      ? ((event as { participant_limit?: number }).participant_limit ?? 0)
      : 0

  const familyApplicants = days.length ? await loadEventApplicants(payload, event, days.map(day => day.id)) : []
  const applications = [...new Map(familyApplicants.filter(row => !row.integrityWarning && row.submission).map(row => [row.submission!.id, { id: row.submission!.id, label: [row.user && typeof row.user === 'object' ? [row.user.name_english?.first_name, row.user.name_english?.last_name, row.user.academic?.student_id, row.user.email].filter(Boolean).join(' ') : String(row.user), `#${row.submission!.id}`].join(' · '), outcomes: familyApplicants.filter(other => other.submission?.id === row.submission!.id).map(other => ({ day: days.find(day => day.id === other.eventId)?.name || String(other.eventId), status: other.status })), dayIds: familyApplicants.filter(other => other.submission?.id === row.submission!.id).map(other => other.eventId) }])).values()]
  const formattedApplicants = await loadEventApplicants(payload, event)
  // The application form's questions become columns; a session reads its group's form.
  const owner = event.parent_event && typeof event.parent_event === 'object' ? event.parent_event : event
  const formId = idOf(owner.subscription_form)
  const form = formId ? await payload.findByID({ collection: 'forms', id: formId, depth: 0 }).catch(() => null) : null

  // Group: one row per person, a status per session; each session's own extra questions label its answers.
  const people = new Map<string, GroupApplicant>()
  for (const row of familyApplicants) {
    const u = typeof row.user === 'object' && row.user ? row.user : null
    const key = String(u?.id ?? row.user)
    const person = people.get(key) ?? { key, name: u ? [u.name_english?.first_name, u.name_english?.last_name].filter(Boolean).join(' ') || u.email : key, email: u?.email ?? '', createdAt: row.createdAt, answers: row.submission?.submissionData ?? null, sessions: [] }
    person.sessions.push({ regId: row.id, dayId: row.eventId, status: row.status, extra: row.sessionAnswers })
    people.set(key, person)
  }
  const dayFields: Record<number, ReturnType<typeof answerFields>> = {}
  for (const day of days) { const extra = idOf(day.subscription_form); dayFields[day.id] = extra ? answerFields(await payload.findByID({ collection: 'forms', id: extra, depth: 0 }).catch(() => null)) : [] }
  const groupDays = days.map(day => ({ id: day.id, name: day.name, left: day.participant_limit ? Math.max(day.participant_limit - familyApplicants.filter(row => row.eventId === day.id && SEATED_STATUSES.includes(row.status)).length, 0) : null }))

  const counts = await staffTabCounts(payload, [event.id, ...days.map(day => day.id)])

  return (
    <StaffShell event={event} t={t} tab="applicants" showReflections={canAssignForms(user)} showSettings={canSeeEventSettings(user, event)} counts={counts}>
      <div className="mt-8" />
      {days.length > 0 && <><GroupApplicantsTable applicants={[...people.values()]} days={groupDays} fields={answerFields(form)} dayFields={dayFields} /><EventOperationsOverview payload={payload} event={event} days={days} user={user} locale={locale} /><StaffDayAdjustment parentId={event.id} applications={applications} days={days.filter(day => Date.parse(day.date_begin) > Date.now()).map(day => ({ id: day.id, name: day.name }))} /></>}
      {!days.length && <ApplicantPoolManager
        eventId={id}
        applicants={formattedApplicants}
        participantLimit={participantLimit}
        fields={answerFields(form)}
      />}
    </StaffShell>
  )
}
