import React from 'react'
import type { Metadata } from 'next'
import Record from '@/components/Record'
import { getPayload } from 'payload'
import config from '@payload-config'
import EventCard from '@/components/EventCard'
import PageHeader from '@/components/PageHeader'
import { mapPayloadEvent, getUserEventStatuses } from '@/libs/event'
import { getDictionary } from '@/i18n/server'
import { Locale } from '@/i18n/config'
import { headers } from 'next/headers'
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
  const { user } = await payload.auth({ headers: await headers() })
  const now = new Date().toISOString()
  const siteSettings = await getSiteSettings()
  const notSample = sampleWhere(siteSettings.showSampleData)

  const [upcoming, past] = await Promise.all([
    payload.find({
      collection: 'events',
      where: { date_begin: { greater_than_equal: now }, is_visible: { equals: true }, ...notSample },
      sort: 'date_begin',
      limit: 20,
    }),
    payload.find({
      collection: 'events',
      where: { date_begin: { less_than: now }, is_visible: { equals: true }, ...notSample },
      sort: '-date_begin',
      limit: 20,
    }),
  ])

  const statuses = await getUserEventStatuses(
    payload,
    user?.id,
    [...upcoming.docs, ...past.docs].map((doc) => doc.id),
  )
  const mapWithStatus = (doc: (typeof upcoming.docs)[number]) =>
    mapPayloadEvent(doc, statuses[String(doc.id)])

  const upcomingEvents = upcoming.docs.map(mapWithStatus)
  const pastEvents = past.docs.map(mapWithStatus)

  return (
    <>
      <PageHeader
        title="Sessions, workshops and observerships"
        lead="Every session is capped. Registration opens ahead of time and closes before the session starts."
      />

      {/*
        Upcoming and past deliberately do NOT share a component. An upcoming
        session is a decision and gets a card; a past one is history and gets a
        record. Both being the same grid is what made five pages feel like one.

        They do share a *track*, though — `.card-grid`. The two rules are not in
        tension: what must differ is the component, what must match is the
        rhythm it sits on. These had drifted to 240px/18px against 310px/12px,
        which put four columns above three on column widths 4px apart, so the
        sections read as two pages rather than two parts of one.
      */}
      <div className="rail">
        <h2 className="type-h2">{t.upcoming}</h2>
        <span className="rail-bar" />
        <span className="meta-mono">{upcomingEvents.length} upcoming</span>
      </div>
      {upcomingEvents.length > 0 ? (
        <div className="card-grid mb-[52px]">
          {upcomingEvents.map((event) => (
            <EventCard key={event.id} event={event} imageDisplay={siteSettings.eventCardImageDisplay} />
          ))}
        </div>
      ) : (
        <div className="empty-note mb-[52px]">
          <p className="font-medium text-secondary-foreground">{t.no_upcoming}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{t.stay_tuned}</p>
        </div>
      )}

      <div className="rail">
        <h2 className="type-h2">{t.past}</h2>
        <span className="rail-bar" />
        <span className="meta-mono">{pastEvents.length}</span>
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
