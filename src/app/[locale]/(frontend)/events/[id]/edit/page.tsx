import React from 'react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/libs/auth/current-user'
import { canAssignForms, hasPermission } from '@/libs/permissions'
import { canManageEvent, canSeeEventSettings, eventDays } from '@/libs/event-workflow'
import { assignmentState, idOf } from '@/libs/form-assignment-lifecycle'
import { SEATED_STATUSES } from '@/libs/applicant-status'
import { eventStatus, mapPayloadEvent } from '@/libs/event'
import { findTags, tagLabel, tagPath } from '@/libs/tags'
import { formatStamp } from '@/libs/utils'
import { getSiteSettings } from '@/libs/site-settings'
import { type EventSection, type EventStructure, sectionFields } from '@/libs/event-sections'
import { getDictionary } from '@/i18n/server'
import type { Locale } from '@/i18n/config'
import type { Event as EventDoc, User } from '@/payload-types'
import ReflectionTable, { type ReflectionRow } from '@/components/ReflectionTable'
import { answerFields } from '@/libs/forms/answers'
import GalleryLinks from '@/components/events/GalleryLinks'
import { ProgressSteps, type ProgressStep } from '@/components/ui/progress-steps'
import MiniRecord from '@/components/Record'
import StaffShell, { type StaffTab } from '@/components/events/StaffShell'
import EventView from '@/components/events/EventView'
import SectionSheet, { type Option } from '@/components/events/SectionSheet'
import { EventCopyRemove, InfoSheet, MakeGroup, PublishNow, RegistrationSwitch, ReleaseNow } from '@/components/events/StaffActions'
import EventNotificationPreview from '@/components/EventNotificationPreview'
import { Button } from '@/components/ui/button'

const personName = (person: unknown) => {
  if (!person || typeof person !== 'object') return null
  const p = person as Pick<User, 'id' | 'name_english' | 'name_thai'>
  return [p.name_english?.first_name, p.name_english?.last_name].filter(Boolean).join(' ') || [p.name_thai?.first_name, p.name_thai?.last_name].filter(Boolean).join(' ') || String(p.id)
}

function Box({ title, action, rows, children }: { title: string; action?: React.ReactNode; rows: [string, React.ReactNode][]; children?: React.ReactNode }) {
  return (
    <section className="panel p-5">
      <div className="panel-head items-center">
        <h2 className="panel-title">{title}</h2>
        {action}
      </div>
      <dl className="space-y-2.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 text-meta">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {children && <div className="mt-4 space-y-2">{children}</div>}
    </section>
  )
}

export default async function EditEvent({ params, searchParams }: { params: Promise<{ id: string; locale: Locale }>; searchParams: Promise<{ tab?: string; session?: string; step?: string }> }) {
  const { id, locale } = await params
  const { tab: tabParam, session: sessionParam, step: stepParam } = await searchParams
  const payload = await getPayload({ config })
  const user = await getCurrentUser(payload)
  if (!user) redirect('/login')
  const eventDoc = await payload.findByID({ collection: 'events', id, depth: 2 }).catch(() => null)
  if (!eventDoc || !canManageEvent(user, eventDoc)) notFound()
  // A session is a subsection of its group, never a page of its own: send old links to the parent's Sessions tab.
  const parentOfDay = idOf(eventDoc.parent_event as never)
  if (parentOfDay) redirect(`/${locale}/events/${parentOfDay}/edit?tab=sessions&session=${eventDoc.id}`)

  const t = (await getDictionary(locale)).events
  const isGroupDoc = eventDoc.event_structure === 'multi_day'
  const settingsAllowed = canSeeEventSettings(user, eventDoc)
  const setup = isGroupDoc && !eventDoc.is_visible && (stepParam === 'basics' || stepParam === 'sessions' || stepParam === 'review') ? stepParam : null
  const tab: StaffTab = tabParam === 'sessions' || tabParam === 'reflections' || (tabParam === 'settings' && settingsAllowed) ? tabParam : 'basics'
  const structure = (eventDoc.event_structure || 'standalone') as EventStructure
  const isGroup = structure === 'multi_day'
  const managesAll = hasPermission(user, 'manage_events')
  const assigns = canAssignForms(user)
  const days = isGroup ? await eventDays(payload, eventDoc.id, true) : []
  const ids = [eventDoc.id, ...days.map(day => day.id)]

  const [registrations, reflections, forms, eventTypes, departments, locations, people, groups, settings] = await Promise.all([
    payload.find({ collection: 'registrations', where: { event: { in: ids } }, pagination: false, depth: 0, select: { event: true, status: true } }),
    payload.find({ collection: 'form-assignments', where: { and: [{ source_event: { in: ids } }, { kind: { equals: 'event_reflection' } }] }, pagination: false, depth: 0, select: { completed: true, cancelled_at: true, active_at: true, deadline: true } }),
    payload.find({ collection: 'forms', pagination: false, depth: 0, overrideAccess: false, user, select: { title: true } }),
    findTags(payload, 'event_type'), findTags(payload, 'department'), findTags(payload, 'location'),
    managesAll ? payload.find({ collection: 'users', depth: 0, pagination: false, select: { name_english: true, name_thai: true } }) : null,
    managesAll ? payload.find({ collection: 'groups', depth: 0, pagination: false, select: { name: true } }) : null,
    getSiteSettings(),
  ])

  const counts = (eventIds: number[]) => {
    const rows = registrations.docs.filter(row => eventIds.includes(Number(idOf(row.event))))
    return {
      seated: rows.filter(row => SEATED_STATUSES.includes(row.status || '')).length,
      waiting: rows.filter(row => row.status === 'subscribed').length,
      pending: rows.filter(row => row.status === 'applicant').length,
    }
  }
  const stamp = (value?: string | null) => value ? formatStamp(value, locale) : '—'
  const limit = (value?: number | null) => value ? String(value) : t.unlimited
  const formTitle = (ref: unknown) => forms.docs.find(form => form.id === idOf(ref as never))?.title || '—'

  const tagOptions = (tags: Awaited<ReturnType<typeof findTags>>, label: (tag: never) => string | null) => tags.map(tag => ({ value: String(tag.id), label: label(tag as never) || String(tag.id) }))
  const formOptions = forms.docs.map(form => ({ value: String(form.id), label: form.title }))
  const options: Record<string, Option[]> = {
    event_type: tagOptions(eventTypes, tag => tagLabel(tag, locale)),
    department: tagOptions(departments, tag => tagLabel(tag, locale)),
    location: tagOptions(locations, tag => tagPath(tag, locale)),
    subscription_form: formOptions, loa_form: formOptions, reflection_form: formOptions,
    status_override: Object.entries(t.override).map(([value, label]) => ({ value, label, hint: t.staff.override_hint[value as keyof typeof t.staff.override_hint] })),
    registration_selection_mode: Object.entries(t.selection).map(([value, label]) => ({ value, label, hint: t.staff.selection_hint[value as keyof typeof t.staff.selection_hint] })),
    owner: people?.docs.map(person => ({ value: String(person.id), label: personName(person)! })) || [],
    coordinator: people?.docs.map(person => ({ value: String(person.id), label: personName(person)! })) || [],
    groups: groups?.docs.map(group => ({ value: String(group.id), label: group.name })) || [],
  }

  // Relations go to the sheets as IDs; everything else as stored.
  const valuesOf = (doc: object) => Object.fromEntries(Object.entries(doc).map(([key, value]) => [key, key === 'groups' ? ((value || []) as never[]).map(v => idOf(v)) : value && typeof value === 'object' && 'id' in value ? idOf(value as never) : value]))
  const values = valuesOf(eventDoc)
  const sheet = (section: EventSection, title: string, description?: string) => (
    <SectionSheet eventId={eventDoc.id} title={title} description={description} fields={sectionFields(section, structure)} values={values} options={options} />
  )
  const daySheet = (day: (typeof days)[number], section: EventSection, title: string, description?: string) => (
    <SectionSheet eventId={day.id} title={title} description={description} fields={sectionFields(section, 'day')} values={valuesOf(day)} options={options} />
  )

  const own = counts([eventDoc.id])
  const application: [string, React.ReactNode][] = [
    [isGroup ? t.editor.common_form : t.editor.subscription_form, eventDoc.subscription_form ? formTitle(eventDoc.subscription_form) : <span className="text-destructive">{t.staff.no_form}</span>],
    [t.editor.registration_opens_at, eventDoc.registration_opens_at ? stamp(eventDoc.registration_opens_at) : t.staff.opens_on_publish],
    [t.editor.registration_closes_at, eventDoc.registration_closes_at ? stamp(eventDoc.registration_closes_at) : t.staff.closes_at_end],
    [t.editor.status_override, eventDoc.status_override === 'closed' ? t.staff.closed_by_staff : t.staff.automatic],
  ]
  const seats: [string, React.ReactNode][] = [
    [t.editor.registration_selection_mode, t.selection[(eventDoc.registration_selection_mode || 'manual') as keyof typeof t.selection]],
    [t.staff.seated, `${own.seated} / ${limit(eventDoc.participant_limit)}`],
    [t.staff.waiting, eventDoc.max_waiting_list ? `${own.waiting} / ${eventDoc.max_waiting_list}` : String(own.waiting)],
    [t.staff.pending, String(own.pending)],
  ]
  const states = reflections.docs.map(row => assignmentState(row))
  let reflectionRows: ReflectionRow[] = []
  let reflectionFields: ReturnType<typeof answerFields> = []
  if (tab === 'reflections') {
    const detailed = await payload.find({ collection: 'form-assignments', where: { and: [{ source_event: { in: ids } }, { kind: { equals: 'event_reflection' } }] }, pagination: false, depth: 2 })
    const reflectionForm = typeof eventDoc.reflection_form === 'object' ? eventDoc.reflection_form : null
    reflectionFields = answerFields(reflectionForm ?? (detailed.docs.find(row => typeof row.form === 'object')?.form as any))
    reflectionRows = detailed.docs.filter(row => assignmentState(row) !== 'cancelled').map(row => {
      const person = typeof row.user === 'object' ? row.user : null
      const submission = typeof row.submission === 'object' ? row.submission : null
      return { id: row.id, name: person ? personName(person) || person.email : String(row.user), email: person?.email, state: assignmentState(row) as ReflectionRow['state'], answers: submission?.submissionData ?? null }
    })
  }
  const exportAllowed = hasPermission(user, 'export_data')

  // Reflection progress in one line, zeros left out (show the decision, not the data).
  const progress = (['overdue', 'pending', 'dormant', 'complete'] as const)
    .map(state => [state, states.filter(s => s === state).length] as const)
    .filter(([, n]) => n > 0)
    .map(([state, n]) => `${n} ${t.staff[state].toLocaleLowerCase(locale)}`)
    .join(' · ') || t.staff.none_yet

  const eventView = mapPayloadEvent(eventDoc)
  const now = Date.now()
  const opensAt = eventDoc.registration_opens_at ? Date.parse(eventDoc.registration_opens_at) : null
  const closesAt = eventDoc.registration_closes_at ? Date.parse(eventDoc.registration_closes_at) : null
  const endsAt = Date.parse(eventDoc.date_end || eventDoc.date_begin)
  const forcedClosed = eventDoc.status_override === 'closed'
  const regState: 'notopen' | 'open' | 'closed' = forcedClosed || (closesAt != null && closesAt <= now) ? 'closed' : !eventDoc.is_visible || (opensAt != null && opensAt > now) ? 'notopen' : 'open'
  const applied = registrations.docs.filter(row => ids.includes(Number(idOf(row.event)))).length
  const closesLabel = closesAt ? stamp(eventDoc.registration_closes_at) : undefined
  const reflectionDue = eventDoc.reflection_deadline ? Date.parse(eventDoc.reflection_deadline) : null
  const steps: ProgressStep[] = [
    { label: t.staff.step_not_open, note: !eventDoc.is_visible ? t.staff.step_draft : opensAt ? stamp(eventDoc.registration_opens_at) : undefined, state: regState === 'notopen' ? 'current' : 'done' },
    { label: t.staff.step_open, note: regState === 'open' ? `${applied} ${t.staff.step_applied}${closesLabel ? ` · ${closesLabel}` : ''}` : undefined, state: regState === 'open' ? 'current' : regState === 'closed' ? 'done' : 'todo' },
    { label: t.staff.step_closed, state: regState === 'closed' && endsAt > now ? 'current' : regState === 'closed' ? 'done' : 'todo' },
    { label: t.staff.session_section, note: stamp(eventDoc.date_begin), state: endsAt <= now ? 'done' : now >= Date.parse(eventDoc.date_begin) ? 'current' : 'todo' },
    { label: t.reflection, note: reflectionDue ? stamp(eventDoc.reflection_deadline) : t.staff.no_reflection, state: reflectionDue && reflectionDue <= now ? 'done' : endsAt <= now ? 'current' : 'todo' },
  ]
  const applicationBox = (
    <Box
      title={t.application}
      action={sheet('registration', t.application)}
      rows={structure === 'multi_day' ? [...application, [t.days, String(days.length)]] : structure === 'day' ? seats : [...application, ...seats]}
    >
      {structure !== 'day' && <RegistrationSwitch eventId={eventDoc.id} name={eventDoc.name} open={!forcedClosed} applied={applied} pending={own.pending} closesOn={closesLabel} />}
      {structure !== 'multi_day' && (
        <InfoSheet label={t.staff.email_preview} title={t.staff.email_preview}>
          <EventNotificationPreview event={eventDoc as EventDoc} locale={locale} />
        </InfoSheet>
      )}
    </Box>
  )
  const reflectionBox = (
    <Box
      title={t.reflection}
      action={sheet('reflection', t.reflection)}
      rows={eventDoc.reflection_form ? [
        [t.editor.reflection_form, formTitle(eventDoc.reflection_form)],
        [t.editor.reflection_release_at, stamp(eventDoc.reflection_release_at || eventDoc.date_end || eventDoc.date_begin)],
        [t.editor.reflection_deadline, stamp(eventDoc.reflection_deadline)],
        [t.staff.progress, progress],
      ] : [[t.editor.reflection_form, t.staff.no_reflection]]}
    >
      {eventDoc.reflection_form ? <ReleaseNow eventId={eventDoc.id} /> : null}
    </Box>
  )

  const localeStr = locale === 'th' ? 'th-TH' : 'en-GB'
  const groupSessions = isGroup ? (() => {
          const current = days.find(day => String(day.id) === sessionParam) ?? days[0]
          const c = current ? counts([current.id]) : null
          return (
            <div className="grid items-start gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
              {/* The session list is the group's own subsection: pick one and its sections open beside it. */}
              <nav aria-label={t.days} className="flex flex-col gap-2">
                {days.map(day => {
                  const dc = counts([day.id])
                  const active = day.id === current?.id
                  return (
                    <Link key={day.id} href={`/events/${eventDoc.id}/edit?${setup ? 'step=sessions' : 'tab=sessions'}&session=${day.id}`} aria-current={active ? 'true' : undefined} className={`rounded-md border p-3.5 ${active ? 'border-accent bg-card' : 'border-border hover:bg-card'}`}>
                      <span className="block font-medium">{day.name}</span>
                      <span className="block text-meta text-muted-foreground"><time dateTime={day.date_begin}>{new Date(day.date_begin).toLocaleDateString(localeStr, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Bangkok' })}</time> · {dc.seated} / {limit(day.participant_limit)}{dc.pending ? ` · ${dc.pending} ${t.staff.pending.toLocaleLowerCase(locale)}` : ''}</span>
                    </Link>
                  )
                })}
                <Button asChild variant="outline"><Link href={`/events/new?parent=${eventDoc.id}${setup ? `&next=${encodeURIComponent(`/events/${eventDoc.id}/edit?step=sessions`)}` : ''}`}>{t.staff.add_session}</Link></Button>
              </nav>
              {current && c ? (
                <div className="flex max-w-xl flex-col gap-3.5">
                  <Box title={t.staff.session_section} action={daySheet(current, 'basics', t.staff.basics, t.staff.times_note)} rows={[
                    [t.editor.name, current.name],
                    [t.editor.date_begin, stamp(current.date_begin)],
                    [t.editor.date_end, stamp(current.date_end)],
                  ]} />
                  <Box title={t.staff.seats_section} action={daySheet(current, 'registration', t.application)} rows={[
                    [t.editor.extra_form, current.subscription_form ? formTitle(current.subscription_form) : t.staff.no_extra],
                    [t.editor.registration_opens_at, current.registration_opens_at ? stamp(current.registration_opens_at) : t.staff.follows_group],
                    [t.editor.registration_closes_at, current.registration_closes_at ? stamp(current.registration_closes_at) : t.staff.follows_group],
                    [t.editor.registration_selection_mode, t.selection[(current.registration_selection_mode || 'manual') as keyof typeof t.selection]],
                    [t.staff.seated, `${c.seated} / ${limit(current.participant_limit)}`],
                    [t.staff.waiting, current.max_waiting_list ? `${c.waiting} / ${current.max_waiting_list}` : String(c.waiting)],
                    [t.staff.pending, String(c.pending)],
                  ]} />
                  {assigns && <Box title={t.reflection} action={daySheet(current, 'reflection', t.reflection)} rows={current.reflection_form ? [
                    [t.editor.reflection_form, formTitle(current.reflection_form)],
                    [t.editor.reflection_release_at, stamp(current.reflection_release_at || current.date_end || current.date_begin)],
                    [t.editor.reflection_deadline, stamp(current.reflection_deadline)],
                  ] : [[t.editor.reflection_form, t.staff.no_reflection]]} />}
                  <Box title={t.joining_details} action={daySheet(current, 'joining', t.joining_details, t.staff.joining_note)} rows={[[t.staff.joining_note, current.participant_detail ? t.staff.set : t.staff.empty]]} />
                </div>
              ) : null}
            </div>
          )
  })() : null

  if (setup) {
    const order = ['basics', 'sessions', 'review'] as const
    const at = order.indexOf(setup)
    const stepHref = (key: string) => `/events/${eventDoc.id}/edit?step=${key}`
    return (
      <>
        <div className="flex items-end gap-5">
          <div className="min-w-0 flex-1">
            <Link href="/events/manage" className="text-meta text-muted-foreground hover:text-foreground">← {t.back_to_events}</Link>
            <h1 className="type-h1 mt-5">{eventDoc.name}</h1>
            <p className="mt-2 text-meta text-muted-foreground">{t.staff.draft_group}</p>
          </div>
          <Link href="/events/manage" className="text-body text-accent">{t.staff.finish_later}</Link>
        </div>
        <ol aria-label={t.staff.setup_steps} className="mt-6 grid grid-cols-3 gap-1.5">
          {order.map((key, i) => (
            <li key={key}><Link href={stepHref(key)} aria-current={i === at ? 'step' : undefined} className={`flex flex-col gap-2 text-meta ${i === at ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}><span className={`h-[3px] rounded-sm ${i <= at ? 'bg-accent' : 'bg-border-strong'}`} />{t.staff.setup[key]}</Link></li>
          ))}
        </ol>
        <p className="mt-2 text-right text-meta text-muted-foreground">{t.staff.step_of.replace('{n}', String(at + 1))}</p>
        <div className="mt-8">
          {setup === 'basics' && (
            <section className="max-w-xl space-y-4">
              <h2 className="type-h2">{t.staff.setup_basics_title}</h2>
              <SectionSheet eventId={eventDoc.id} title={t.staff.basics} fields={[...sectionFields('basics', 'multi_day'), ...sectionFields('details'), ...sectionFields('joining')]} values={values} options={options} inline={{ next: stepHref('sessions'), label: t.staff.continue }} />
            </section>
          )}
          {setup === 'sessions' && (
            <div className="space-y-8">
              <div className="flex max-w-xl flex-col gap-2">
                <h2 className="type-h2">{t.staff.setup_sessions_title}</h2>
                <p className="text-meta text-muted-foreground">{t.staff.setup_sessions_note}</p>
                <Box title={t.staff.common_questions} action={sheet('registration', t.staff.common_questions)} rows={[[t.editor.common_form, eventDoc.subscription_form ? formTitle(eventDoc.subscription_form) : <span className="text-destructive">{t.staff.no_form}</span>]]} />
              </div>
              {groupSessions}
              <div className="flex max-w-xl justify-between"><Button asChild variant="outline"><Link href={stepHref('basics')}>{t.staff.back}</Link></Button><Button asChild><Link href={stepHref('review')}>{t.staff.continue}</Link></Button></div>
            </div>
          )}
          {setup === 'review' && (
            <div className="space-y-6">
              <p className="text-meta text-muted-foreground">{t.staff.review_note}</p>
              <EventView bare event={eventView} locale={locale} t={t} imageDisplay={settings.eventDetailImageDisplay} isGroup sessions={days.map(day => ({ id: day.id, name: day.name, date_begin: day.date_begin, href: `/events/${eventDoc.id}/edit?step=sessions&session=${day.id}`, event: mapPayloadEvent(day), sub: `${limit(day.participant_limit)} ${t.staff.seats}` }))} showJoining={false} />
              <div className="flex items-center gap-3 border-t border-border pt-5"><span className="flex-1 text-meta text-muted-foreground">{t.staff.ready_note}</span><Button asChild variant="outline"><Link href="/events/manage">{t.staff.keep_draft}</Link></Button><PublishNow eventId={eventDoc.id} label={t.staff.publish} /></div>
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <StaffShell event={eventDoc} t={t} tab={tab} showReflections={assigns} showSettings={settingsAllowed} counts={{ pending: own.pending, overdue: states.filter(s => s === 'overdue').length }}>
      <div className="mt-8">
        {tab === 'basics' && (
          <EventView
            bare
            event={eventView}
            locale={locale}
            t={t}
            imageDisplay={settings.eventDetailImageDisplay}
            isGroup={false}
            sessions={[]}
            showJoining
            joiningNote={t.staff.joining_note}
            edit={{ basics: sheet('basics', t.staff.basics, t.staff.times_note), details: sheet('details', t.about_event), joining: sheet('joining', t.joining_details, t.staff.joining_note) }}
          />
        )}
        {tab === 'sessions' && structure !== 'day' && <ProgressSteps label={t.staff.tab_sessions} steps={steps} />}
        {tab === 'sessions' && !isGroup && (
          // A single event is one session: show it the way a group shows its selected session, with the group offer as a footnote.
          <div className="flex max-w-xl flex-col gap-3.5">
            <Box
              title={t.staff.session_section}
              action={<SectionSheet eventId={eventDoc.id} title={t.staff.session_section} description={t.staff.times_note} fields={sectionFields('basics', structure).filter(field => field.name === 'date_begin' || field.name === 'date_end')} values={values} options={options} />}
              rows={[[t.editor.date_begin, stamp(eventDoc.date_begin)], [t.editor.date_end, stamp(eventDoc.date_end)]]}
            />
            {applicationBox}
            {structure === 'standalone' && (
              <div className="mt-3 border-t border-border pt-5">
                <MakeGroup eventId={eventDoc.id} />
              </div>
            )}
          </div>
        )}
        {tab === 'sessions' && groupSessions}
        {tab === 'reflections' && assigns && (
          <div className="grid items-start gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
            {reflectionBox}
            <div className="flex min-w-0 flex-col gap-6">
              <ReflectionTable rows={reflectionRows} fields={reflectionFields} />
              <GalleryLinks eventId={eventDoc.id} initial={(eventDoc.gallery_links ?? []).map(link => ({ title: link.title, url: link.url }))} />
            </div>
          </div>
        )}
        {tab === 'settings' && (
          <div className="flex max-w-md flex-col gap-3.5">
            <p role="note" className="rounded-md border border-warning/40 bg-warning/10 p-4 text-meta text-secondary-foreground">{t.staff.settings_experimental}</p>
            {managesAll && (
              <Box
                title={t.staff.responsible}
                action={sheet('people', t.staff.responsible)}
                rows={[
                  [t.editor.owner, personName(eventDoc.owner) || t.staff.not_assigned],
                  [t.editor.coordinator, personName(eventDoc.coordinator) || t.staff.not_assigned],
                  ...(eventDoc.groups?.length ? [[t.staff.groups, eventDoc.groups.map(group => typeof group === 'object' ? group.name : group).join(', ')] as [string, string]] : []),
                ]}
              />
            )}
            <EventCopyRemove eventId={eventDoc.id} hasApplicants={applied > 0} />
            <nav className="flex flex-wrap gap-x-5 gap-y-2 text-meta" aria-label={t.staff.overview}>
              {exportAllowed && <a className="text-accent" href={`/api/events/${eventDoc.id}/export?kind=roster`}>{t.staff.roster}</a>}
              {exportAllowed && <a className="text-accent" href={`/api/events/${eventDoc.id}/export?kind=applications`}>{t.staff.applications}</a>}
              <Link className="text-accent" href={`/events/${eventDoc.id}`}>{t.staff.view_public}</Link>
              {managesAll && <Link className="text-accent" href={`/admin/collections/events/${eventDoc.id}`}>{t.staff.advanced}</Link>}
            </nav>
          </div>
        )}
      </div>
    </StaffShell>
  )
}
