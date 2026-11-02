import React from 'react'
import Link from 'next/link'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { type Event, eventStatus, eventWhen, formatEventDuration } from '@/libs/event'
import StatusMark, { type StatusKey } from '@/components/StatusMark'
import MiniRecord from '@/components/Record'
import PosterFigure from '@/components/events/PosterFigure'
import type { getDictionary } from '@/i18n/server'
import type { Locale } from '@/i18n/config'
import { cn } from '@/libs/utils'

export type EventViewSession = { id: number; name: string; date_begin: string; href: string; event: Event; status?: string; sub?: string; mark?: StatusKey; markLabel?: string }

/*
  The event page body, shared by the public route and the staff edit route so
  the edit page *is* the preview. Routes own data and the aside; this owns
  layout. `edit` slots put a control beside the region it changes.
*/
export default function EventView({ event, locale, t, sessions, isGroup, showJoining, joiningNote, top, after, aside, edit, bare, titleAction, stickyAside = true, sessionsSlot }: {
  sessionsSlot?: React.ReactNode
  event: Event
  locale: Locale
  t: Awaited<ReturnType<typeof getDictionary>>['events']
  sessions: EventViewSession[]
  isGroup: boolean
  showJoining: boolean
  joiningNote?: string
  top?: React.ReactNode
  after?: React.ReactNode
  aside?: React.ReactNode
  // Under the staff shell: the shell owns back link and title, so only the body renders.
  bare?: boolean
  // Sits on the title row, after the title (e.g. the staff "Edit event" link on the public page).
  titleAction?: React.ReactNode
  edit?: { basics: React.ReactNode; poster?: React.ReactNode; details: React.ReactNode; joining: React.ReactNode; sessions?: React.ReactNode }
  // The poster and the action card stick while the text scrolls; a stack of staff panels would outgrow the viewport.
  stickyAside?: boolean
}) {
  const localeStr = locale === 'th' ? 'th-TH' : 'en-GB'
  const when = eventWhen(event, localeStr)
  const specs: { label: string; value: React.ReactNode }[] = [
    { label: t.duration, value: <time dateTime={event.date_begin || event.date}>{formatEventDuration(event, { locale: localeStr, timeZone: 'Asia/Bangkok', includeWeekday: true, fallback: t.tba })}</time> },
    { label: t.venue, value: event.venue || t.tba },
  ]
  if (event.coordinatorName) specs.push({ label: t.coordinator, value: event.coordinatorName })
  specs.push({ label: t.participant_limit, value: event.participantLimit ? String(event.participantLimit) : t.unlimited })
  if (event.registrationOpensAt) {
    specs.push({
      label: t.registration_opens,
      value: new Date(event.registrationOpensAt).toLocaleString(localeStr, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Bangkok' }),
    })
  }

  return (
    <>
      {!bare && (
        <div className="flex items-center justify-between gap-3">
          <Link href={event.parentId ? `/events/${event.parentId}` : '/events'} className="hit-area text-meta text-muted-foreground hover:text-foreground">
            ← {event.parentId ? t.parent_event : t.back_to_events}
          </Link>
          {titleAction}
        </div>
      )}

      {top}

      {/*
        Two columns: poster and action on the left, the page on the right. The
        header is its own block so that on a phone it reads first, then the
        poster and the action, then the text. The left column is as tall as the
        page; the poster and the action card stick together inside it, so both
        stay in view while the description scrolls.
      */}
      <article className={cn(bare ? 'mt-3' : 'mt-6', 'grid items-start gap-x-11 lg:grid-cols-[340px_minmax(0,1fr)] lg:grid-rows-[auto_1fr]')}>
        <header className="min-w-0 lg:col-start-2 lg:row-start-1">
          <div className={cn('mb-2.5 flex flex-wrap gap-x-3 gap-y-2', bare ? 'items-center' : 'items-baseline')}>
            <p className="text-meta font-medium tabular-nums text-secondary-foreground">
              {when.date}
              {when.time ? <span className="font-normal text-muted-foreground"> · {when.time}</span> : null}
            </p>
            {/* Staff: the one Edit covers date, time, title and kind, so it sits on their row. */}
            <span className="ml-auto flex items-center gap-3">
              <StatusMark status={eventStatus(event)} />
              {bare && edit?.basics}
            </span>
          </div>

          {!bare && (
            <div className="mb-3 flex items-start gap-4">
              <h1 className="type-h1 min-w-0 flex-1">{event.name}</h1>
              {edit?.basics}
            </div>
          )}

          <div className="mb-7 flex flex-wrap gap-x-3 gap-y-1.5 text-meta text-muted-foreground">
            {event.eventType && <span className="font-medium text-accent">{event.eventType}</span>}
            {event.eventType && event.department ? <span aria-hidden="true">·</span> : null}
            {event.department && <span>{event.department}</span>}
          </div>
        </header>

        <div className="mb-9 flex flex-col gap-3.5 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:mb-0 lg:self-stretch">
          <div className={cn('flex flex-col gap-3.5', stickyAside && 'lg:sticky lg:top-24')}>
            <PosterFigure src={event.posterUri} alt={event.name} fit={stickyAside && Boolean(aside)}>
              {edit?.poster && <div className="absolute right-2.5 top-2.5 z-[2]">{edit.poster}</div>}
            </PosterFigure>
            {aside && <aside className="flex flex-col gap-3.5">{aside}</aside>}
          </div>
        </div>

        <div className="min-w-0 lg:col-start-2 lg:row-start-2">
          {/* No description, no heading — unless staff are here to write one. */}
          {(event.details?.trim() || edit) && (
            <>
              <div className="mb-4 flex items-baseline gap-4">
                <h2 className="type-h2 flex-1">{t.about_event}</h2>
                {edit?.details}
              </div>
              <p className="mb-8 max-w-[60ch] whitespace-pre-wrap text-base leading-[1.75] text-secondary-foreground text-pretty">
                {event.details?.trim() || <span className="text-muted-foreground">{t.staff.empty}</span>}
              </p>
            </>
          )}

          {showJoining && (event.participantDetail || edit) && (
            <div className="mt-7 rounded-md border border-primary/40 bg-primary/10 p-5">
              <div className="mb-3 flex items-baseline gap-4">
                <h2 className="panel-title flex-1 text-accent">{t.joining_details}</h2>
                {edit?.joining}
              </div>
              {joiningNote && <p className="mb-3 text-meta text-muted-foreground">{joiningNote}</p>}
              {event.participantDetail
                ? <div className="prose prose-sm dark:prose-invert max-w-none"><RichText data={event.participantDetail as React.ComponentProps<typeof RichText>['data']} /></div>
                : <p className="text-body text-muted-foreground">{t.staff.empty}</p>}
            </div>
          )}

          {isGroup && (
            <section id="event-days" className="my-9">
              <div className="rail">
                <h2 className="type-h2">{t.days}</h2>
                <span className="rail-bar" />
                {edit?.sessions}
              </div>
              {sessionsSlot ?? <div className="flex flex-col gap-2.5">
                {sessions.map(session => {
                  const sessionWhen = eventWhen(session.event, localeStr)
                  const mark: StatusKey = session.mark ?? (session.status === 'confirmed' ? 'complete' : session.status === 'accepted' || session.status === 'pending' ? 'pending' : eventStatus(session.event))
                  return (
                    <MiniRecord
                      key={session.id}
                      href={session.href}
                      title={session.name}
                      sub={session.sub ?? session.event.venue}
                      meta={<time dateTime={session.date_begin}>{[sessionWhen.date, sessionWhen.time].filter(Boolean).join(' · ')}</time>}
                      status={mark}
                      statusLabel={session.markLabel ?? (session.status ? (t.applicants.status as Record<string, string>)[session.status] : undefined)}
                    />
                  )
                })}
              </div>}
            </section>
          )}

          {after}

          <dl className="spec-grid gap-x-6 gap-y-3 border-t border-border pt-6">
            {specs.map(spec => (
              <React.Fragment key={spec.label}>
                <dt className="whitespace-nowrap">{spec.label}</dt>
                <dd className="text-body text-foreground">{spec.value}</dd>
              </React.Fragment>
            ))}
          </dl>
        </div>

      </article>
    </>
  )
}
