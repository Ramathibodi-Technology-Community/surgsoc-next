import { hasPermission } from '@/libs/permissions'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { eventListPeriod, topLevelEventWhere } from '@/libs/event-workflow'
import React from 'react'
import type { Metadata } from 'next'
import Record from '@/components/Record'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/libs/auth/current-user'
import EventCard from '@/components/EventCard'
import NewEventDialog from '@/components/events/NewEventDialog'
import { SlidersHorizontal } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { mapPayloadEvent, getUserEventStatuses, getSeatedCounts } from '@/libs/event'
import { getDictionary } from '@/i18n/server'
import { Locale } from '@/i18n/config'
import { sampleWhere } from '@/libs/sample-data'
import { getSiteSettings } from '@/libs/site-settings'

export const metadata: Metadata = {
  title: 'Events | RASS',
  description: 'Browse upcoming and past events from the Ramathibodi Surgical Society.',
}

export default async function EventsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params as { locale: Locale }
  const t = (await getDictionary(locale)).events
  const payload = await getPayload({ config })
  const user = await getCurrentUser(payload)
  const canManage = user && (hasPermission(user, 'manage_events') || (await payload.count({ collection: 'events', where: { or: [{ owner: { equals: user.id } }, { 'parent_event.owner': { equals: user.id } }] } })).totalDocs > 0)
  const now = new Date().toISOString()
  const siteSettings = await getSiteSettings()
  const notSample = sampleWhere(siteSettings.showSampleData)

  const [upcoming, past] = await Promise.all([
    payload.find({
      collection: 'events',
      where: { ...eventListPeriod(now), ...topLevelEventWhere, is_visible: { equals: true }, ...notSample },
      sort: 'date_begin',
      limit: 20,
    }),
    payload.find({
      collection: 'events',
      where: { ...eventListPeriod(now, true), ...topLevelEventWhere, is_visible: { equals: true }, ...notSample },
      sort: '-date_begin',
      limit: 20,
    }),
  ])

  const statuses = await getUserEventStatuses(
    payload,
    user?.id,
    [...upcoming.docs, ...past.docs].map((doc) => doc.id),
  )
  const seated = await getSeatedCounts(payload, upcoming.docs.map((doc) => doc.id))
  const mapWithStatus = (doc: (typeof upcoming.docs)[number]) =>
    mapPayloadEvent(doc, statuses[String(doc.id)], seated[String(doc.id)] ?? 0)

  const upcomingEvents = upcoming.docs.map(mapWithStatus)
  const pastEvents = past.docs.map(mapWithStatus)

  return (
    <>
      <PageHeader
        title="Sessions, workshops and observerships"
        lead="Every session is capped. Registration opens ahead of time and closes before the session starts."
        aside={canManage ? (
          <div className="flex items-center gap-2">
            {hasPermission(user, 'manage_events') && <NewEventDialog />}
            <Button asChild variant="outline"><Link href="/events/manage"><SlidersHorizontal />{t.manage_events}</Link></Button>
          </div>
        ) : undefined}
      />

      {/*
        Upcoming and past deliberately do NOT share a component. An upcoming
        session is a decision and gets a card; a past one is history and gets a
        record. Both being the same grid is what made five pages feel like one.

        They do share a *gap*, though — `.event-grid` and `.card-grid` use the same one. The two rules are not in
        tension: what must differ is the component, what must match is the
        rhythm it sits on. These had drifted to 240px/18px against 310px/12px,
        which put four columns above three on column widths 4px apart, so the
        sections read as two pages rather than two parts of one.
      */}
      <div className="rail">
        <h2 className="type-h2">{t.upcoming}</h2>
        <span className="rail-bar" />
        <span className="type-figure">{upcomingEvents.length} upcoming</span>
      </div>
      {upcomingEvents.length > 0 ? (
        <div className="event-grid mb-wide">
          {upcomingEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="empty-note mb-wide">
          <p className="font-medium text-secondary-foreground">{t.no_upcoming}</p>
          <p className="mt-1 text-meta leading-relaxed text-muted-foreground">{t.stay_tuned}</p>
        </div>
      )}

      <div className="rail">
        <h2 className="type-h2">{t.past}</h2>
        <span className="rail-bar" />
        <span className="type-figure">{pastEvents.length}</span>
      </div>
      {pastEvents.length > 0 ? (
        <div className="card-grid">
          {pastEvents.map((event) => (
            <Record
              key={event.id}
              href={`/events/${event.id}`}
              title={event.name}
              tag={event.eventType || null}
              meta={
                <>
                  <time dateTime={event.date_begin || event.date}>
                    {new Date(event.date_begin || event.date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </time>
                  {event.participantCount ? (
                    <>
                      <span className="sep" />
                      <span>{event.participantCount} attended</span>
                    </>
                  ) : null}
                </>
              }
              imageUrl={event.posterUri || null}
              poster
            />
          ))}
        </div>
      ) : (
        <div className="empty-note">
          <p className="font-medium text-secondary-foreground">{t.no_past}</p>
        </div>
      )}
    </>
  )
}
