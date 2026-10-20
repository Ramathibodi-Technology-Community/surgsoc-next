import type { Payload } from 'payload'
import type { Event, User } from '@/payload-types'
import Link from 'next/link'
import { assignmentState } from '@/libs/form-assignment-lifecycle'
import { hasPermission } from '@/libs/permissions'
import { SEATED_STATUSES } from '@/libs/applicant-status'
import { getDictionary } from '@/i18n/server'
import type { Locale } from '@/i18n/config'
import React from 'react'
import { Button } from '@/components/ui/button'
import { formatStamp } from '@/libs/utils'

// Called only after the event-management authorization check; expose counts, never assignment users.
export default async function EventOperationsOverview({ payload, event, days, user, locale }: { payload: Payload; event: Event; days: Event[]; user: User; locale: Locale }) {
  const t = (await getDictionary(locale)).events
  const scoped = [event, ...days]
  const ids = scoped.map(item => item.id)
  const [registrations, assignments] = await Promise.all([
    payload.find({ collection: 'registrations', where: { event: { in: ids } }, pagination: false, depth: 0, select: { event: true, status: true } }),
    payload.find({ collection: 'form-assignments', where: { and: [{ source_event: { in: ids } }, { kind: { equals: 'event_reflection' } }] }, pagination: false, depth: 0, select: { source_event: true, completed: true, cancelled_at: true, active_at: true, deadline: true } }),
  ])
  const stamp = (value: string) => formatStamp(value, locale)
  return (
    <section className="mt-12 space-y-4">
      <div className="rail"><h2 className="type-h2">{t.staff.overview}</h2><span className="rail-bar" /></div>
      {scoped.map(item => {
        const rows = registrations.docs.filter(row => row.event === item.id)
        const reflections = assignments.docs.filter(row => row.source_event === item.id)
        const multi = item.event_structure === 'multi_day'
        const facts: [string, React.ReactNode][] = [
          [t.editor.date_begin, stamp(item.date_begin)],
          [t.editor.is_visible, item.is_visible ? t.staff.visible : t.staff.hidden],
          ...(multi ? [] : [
            [t.editor.registration_selection_mode, t.selection[item.registration_selection_mode || 'manual']],
            [t.staff.seated, `${rows.filter(row => SEATED_STATUSES.includes(row.status || '')).length} / ${item.participant_limit || t.unlimited}`],
            [t.staff.waiting, rows.filter(row => row.status === 'subscribed').length],
            [t.staff.pending, rows.filter(row => row.status === 'applicant').length],
          ] as [string, React.ReactNode][]),
          [t.reflection, (['dormant', 'pending', 'complete', 'overdue', 'cancelled'] as const).map(state => `${t.staff[state]} ${reflections.filter(row => assignmentState(row) === state).length}`).join(' · ')],
        ]
        const reflectionForm = hasPermission(user, 'manage_forms') && item.reflection_form ? (typeof item.reflection_form === 'object' ? item.reflection_form.id : item.reflection_form) : null
        return (
          <article className="panel p-5" key={item.id}>
            <div className="panel-head">
              <h3 className="panel-title">{item.name}</h3>
              <Link className="text-body text-accent" href={`/${locale}/events/${item.id}/applicants`}>{t.applicants.registrations_for}</Link>
            </div>
            <dl className="mt-tight grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-meta text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-body tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-tight flex flex-wrap gap-x-6 gap-y-2 text-body">
              <Link className="text-accent" href={`/${locale}/events/${item.id}/edit`}>{t.staff.edit_event}</Link>
              {hasPermission(user, 'export_data') && (['roster', 'applications'] as const).map(kind => <a key={kind} className="text-accent" href={`/api/events/${item.id}/export?kind=${kind}`}>{t.staff[kind]}</a>)}
              {reflectionForm && <Link className="text-accent" href={`/${locale}/forms/${reflectionForm}/submissions?returnTo=${encodeURIComponent(`/${locale}/events/${item.id}/edit`)}`}>{t.staff.responses}</Link>}
            </div>
          </article>
        )
      })}
      {event.event_structure === 'multi_day' && hasPermission(user, 'manage_events') && <Button asChild variant="outline"><Link href={`/${locale}/events/new?parent=${event.id}`}>{t.staff.add_child}</Link></Button>}
    </section>
  )
}
