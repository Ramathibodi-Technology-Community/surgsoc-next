import React from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/libs/auth/current-user'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import EventApplicationForm from '@/components/EventApplicationForm'
import { eventDays, visibleEvent } from '@/libs/event-workflow'
import { getDictionary } from '@/i18n/server'
import type { Locale } from '@/i18n/config'
import { checkUserActionGate } from '@/libs/user-action-gate'
import GroupApplicationForm, { type ApplySession } from '@/components/GroupApplicationForm'
import { sessionRegistration } from '@/libs/event-application'
import { idOf } from '@/libs/form-assignment-lifecycle'
import { formatStamp } from '@/libs/utils'

/**
 * The three ways registration can be unavailable, in one shape.
 *
 * Each used to render its own screen: `max-w-2xl mx-auto py-12 px-4 text-center`
 * — a second page container inside the layout's, centred on a site that centres
 * nothing — with `text-2xl font-bold` standing in for a heading role and
 * `text-primary-1` as link colour. That token is the *filled-button* fill at 54%
 * lightness; as text on the page it measured about 3:1, under the 4.5:1 body
 * text needs. The accent rung is the one that carries link colour.
 *
 * It is not an error box. Nothing has gone wrong — the reader simply cannot do
 * this here, and the useful part is the way back.
 */
function Unavailable({
  eventId,
  title,
  reason,
}: {
  eventId: string
  title: string
  reason: string
}) {
  return (
    <div className="max-w-[560px]">
      <h1 className="type-h1 mb-3 max-w-[24ch]">{title}</h1>
      <p className="type-lead mb-7 max-w-[54ch]">{reason}</p>
      <Link
        href={`/events/${eventId}`}
        className="text-body font-medium text-accent transition-colors hover:text-accent/80"
      >
        Back to the event
      </Link>
    </div>
  )
}

export default async function ApplyPage({ params, searchParams }: { params: Promise<{ id: string; locale: Locale }>; searchParams: Promise<{ session?: string }> }) {
  const { id, locale } = await params
  const { session: sessionParam } = await searchParams
  const t = (await getDictionary(locale)).events
  const payload = await getPayload({ config })

  // Fetch user early — needed for gate check
  const user = await getCurrentUser(payload)

  const event = await visibleEvent(payload, id, user)
  if (!event) notFound()
  if (event.parent_event) redirect(`/events/${typeof event.parent_event === 'object' ? event.parent_event.id : event.parent_event}/apply`)
  const isGroup = event.event_structure === 'multi_day'
  const mine = await payload.find({ collection: 'registrations', where: { and: [isGroup ? { 'event.parent_event': { equals: event.id } } : { event: { equals: event.id } }, { user: { equals: user?.id ?? 0 } }] }, depth: 0, pagination: false })
  if (mine.totalDocs && !isGroup) redirect(`/events/${id}`)
  const takenIds = new Set(mine.docs.filter(row => !['withdrawn', 'declined'].includes(row.status || '')).map(row => String(idOf(row.event))))
  // A group is gated per session, so only the member's eligibility is checked here; the sessions below carry their own windows.
  const sessionList: ApplySession[] = []
  if (isGroup) {
    for (const day of await eventDays(payload, event.id)) {
      if (Date.parse(day.date_begin) <= Date.now() || takenIds.has(String(day.id)) || !sessionRegistration(day, event).isOpen) continue
      const extraId = idOf(day.subscription_form)
      const form = extraId ? await payload.findByID({ collection: 'forms', id: extraId, depth: 0 }).catch(() => null) : null
      sessionList.push({ id: day.id, name: day.name, when: formatStamp(day.date_begin, locale), form })
    }
    if (!sessionList.length) redirect(`/events/${id}`)
  }

  // Unified gate — auth, profile, form blocking, scheduling
  const gate = await checkUserActionGate(payload, user, {
    resource: isGroup ? undefined : event,
  })

  if (!gate.allowed) {
    if (gate.redirect) {
      redirect(gate.redirect)
    }
    return (
      <Unavailable
        eventId={String(event.id)}
        title="You cannot register for this yet"
        reason={gate.message}
      />
    )
  }

  const formId = typeof event.subscription_form === 'object'
    ? event.subscription_form?.id
    : event.subscription_form

  if (!formId) {
    return (
      <Unavailable
        eventId={String(event.id)}
        title="Registration is not set up yet"
        reason="This session has no registration form attached. The coordinator has to add one before anyone can apply — the event page will show a Register button as soon as they do."
      />
    )
  }

  const form = await payload.findByID({
    collection: 'forms',
    id: formId,
  })

  if (!form) {
    return (
      <Unavailable
        eventId={String(event.id)}
        title="That registration form is missing"
        reason="The form this session points at no longer exists. Nothing you did caused this — tell the coordinator, and register once it is back."
      />
    )
  }

  // user already fetched above for gate check

  return (
    <div className="max-w-[680px]">
      <Link
        href={`/events/${event.id}`}
        className="text-meta text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Back to the event
      </Link>

      <h1 className="type-h1 mb-3 mt-6 max-w-[24ch]">{event.name}</h1>
      <p className="type-lead mb-std max-w-[56ch]">
        {t.application_intro}
      </p>

      <div className="panel p-5 sm:p-[30px]">
        {isGroup
          ? <GroupApplicationForm eventId={event.id} common={mine.totalDocs ? null : form} sessions={sessionList} user={user} preselect={sessionParam && sessionList.some(x => String(x.id) === sessionParam) ? [Number(sessionParam)] : []} />
          : <EventApplicationForm eventId={event.id} form={form} user={user} />}
      </div>
    </div>
  )
}
