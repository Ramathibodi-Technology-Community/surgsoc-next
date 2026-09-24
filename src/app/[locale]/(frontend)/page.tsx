import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'
import EventCard from '@/components/EventCard'
import Record from '@/components/Record'
import { mapPayloadEvent, getUserEventStatuses } from '@/libs/event'
import { Button } from '@/components/ui/button'
import { getHomeContent } from '@/libs/site-content'
import { getCurrentUser } from '@/libs/auth/current-user'

import { getDictionary } from '@/i18n/server'
import { Locale } from '@/i18n/config'
import { sampleWhere } from '@/libs/sample-data'
import { getSiteSettings } from '@/libs/site-settings'
import { assignmentState } from '@/libs/form-assignment-lifecycle'

export async function generateMetadata(): Promise<Metadata> {
  const { hero } = await getHomeContent()
  return { title: hero.heading, description: hero.lead }
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params as { locale: Locale }
  const t = (await getDictionary(locale)).events
  const payload = await getPayload({ config })
  const homeContent = await getHomeContent()
  const hero = homeContent.hero
  const labels = homeContent.labels
  const user = await getCurrentUser(payload)

  const now = new Date().toISOString()

  /*
    Demo records are left out of both the lists and the headline numbers.
    Counting them is the worse failure: a wrong list is obvious, a membership
    figure inflated by four test accounts reads as a real claim.
  */
  const siteSettings = await getSiteSettings()
  const notSample = sampleWhere(siteSettings.showSampleData)

  const [upcoming, past, memberCount, sessionCount, advisorCount] = await Promise.all([
    payload.find({
      collection: 'events',
      where: { is_visible: { equals: true }, date_begin: { greater_than_equal: now }, ...notSample },
      sort: 'date_begin',
      limit: 6,
      depth: 2,
    }),
    payload.find({
      collection: 'events',
      where: { is_visible: { equals: true }, date_begin: { less_than: now }, ...notSample },
      sort: '-date_begin',
      limit: 3,
      depth: 2,
    }),
    payload.count({ collection: 'users', where: notSample }),
    payload.count({ collection: 'events', where: { is_visible: { equals: true }, ...notSample } }),
    payload.count({ collection: 'attendings', where: notSample }),
  ])

  // Forms the signed-in student still owes. Drives the "needs your attention"
  // block, which is omitted entirely when there is nothing outstanding.
  const pendingAssignments = user
    ? (
        await payload.find({
          collection: 'form-assignments',
          where: { user: { equals: user.id }, completed: { not_equals: true } },
          depth: 2,
          sort: '-createdAt',
          limit: 5,
        })
      ).docs.filter((assignment: any) => ['pending', 'overdue'].includes(assignmentState(assignment)))
    : []

  const statuses = user
    ? await getUserEventStatuses(payload, user.id, upcoming.docs.map((e) => e.id))
    : {}
  const upcomingEvents = upcoming.docs.map((doc) => mapPayloadEvent(doc, statuses[String(doc.id)]))

  // The headline number carries the claim; the rest are supporting detail.
  const secondaryStats = [
    { value: sessionCount.totalDocs, label: labels.sessionStat },
    { value: advisorCount.totalDocs, label: labels.advisorStat },
  ]

  return (
    <>
      {/*
        Hero and stat band share one bordered panel: the numbers are evidence for
        the claim above them, so a gap between the two would read as two sections.
      */}
      <section className="panel mb-[52px] rounded-[10px] sm:overflow-visible overflow-hidden">
        <div className="flex flex-wrap items-center">
          <div className="min-w-0 flex-[1_1_420px] px-6 py-10 sm:px-11 sm:pb-13 sm:pt-15">
            <p className="eyebrow mb-[22px]">{hero.eyebrow}</p>
            <h1 className="type-display mb-2.5 max-w-[20ch]">{hero.heading}</h1>
            <p className="font-display mb-6 text-[clamp(1.3rem,2.2vw,1.7rem)] leading-[1.35] text-secondary-foreground">
              {hero.subheading}
            </p>
            <p className="type-lead mb-[34px] max-w-[46ch] whitespace-pre-line">{hero.lead}</p>
            {/* First button solid, the rest outlined — the hero has one primary action. */}
            <div className="flex flex-wrap gap-3">
              {hero.ctas.map((cta, index) => (
                <Button key={cta.href + cta.label} asChild size="lg" variant={index === 0 ? 'default' : 'outline'}>
                  <Link href={cta.href}>{cta.label}</Link>
                </Button>
              ))}
            </div>
          </div>
          {/*
            Rounded and lifted past the panel's own top and right edges — a
            plate laid on top of the frame, not cut into it. sm:overflow-visible
            on the panel is what lets it actually cross that border instead of
            being clipped flush with it.
          */}
          <div className="flex w-full min-w-0 flex-[0_1_400px] justify-end px-6 pb-10 sm:min-w-[260px] sm:px-0 sm:pb-0 sm:pt-7">
            <div className="placeholder-hatch relative z-[2] flex aspect-[4/3] w-full items-end overflow-hidden rounded-[10px] border border-border-strong p-4 shadow-[var(--shadow-lifted)] sm:-mr-6 sm:-mt-6 sm:translate-y-5">
              {/*
                This is the LCP element on the busiest page of the site, and it
                was the one image with no loading strategy at all. fetchPriority
                takes it out of the browser's lazy discovery queue.
              */}
              <img
                src={hero.imageUrl}
                alt=""
                fetchPriority="high"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
        <dl className="flex flex-wrap items-end gap-8 border-t border-border px-6 py-8 sm:gap-11 sm:px-11 sm:py-[34px]">
          <div>
            <dd className="font-display text-[clamp(2.8rem,5vw,3.8rem)] font-semibold leading-[0.95] tabular-nums">
              {memberCount.totalDocs}
            </dd>
            <dt className="label-mono mt-2.5 text-accent">{labels.memberStat}</dt>
          </div>
          <span className="min-w-0 flex-1" />
          {secondaryStats.map((stat, index) => (
            <div key={index}>
              <dd className="font-display text-[26px] font-semibold leading-none tabular-nums">{stat.value}</dd>
              <dt className="mt-1.5 text-[13px] leading-normal text-muted-foreground">{stat.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {pendingAssignments.length > 0 && (
        <section className="mb-[52px]">
          <div className="rail">
            <h2 className="type-h2">{labels.pendingHeading}</h2>
            <span className="rail-bar" />
            <span className="pill-count">{pendingAssignments.length}</span>
          </div>
          <div className="card-grid">
            {pendingAssignments.map((assignment: any) => {
              const due = assignment.deadline ? new Date(assignment.deadline) : null
              const overdue = due ? due.getTime() < Date.now() : false
              return (
                <Record
                  key={assignment.id}
                  href={`/forms/${assignment.form?.id ?? assignment.id}`}
                  title={assignment.form?.title || assignment.title || 'Assigned form'}
                  tag="Assigned"
                  meta={
                    due
                      ? `${overdue ? 'closed' : 'closes'} ${due.toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                        })}`
                      : 'no closing date'
                  }
                  status={overdue ? 'overdue' : due ? 'pending' : 'no-deadline'}
                />
              )
            })}
          </div>
        </section>
      )}

      {/*
        Story sections alternate sides. The order utilities flip the columns on
        odd rows without a second markup branch.
      */}
      <section className="mb-[52px]">
        {homeContent.sections.map((section, index) => (
          <article
            key={`${section.heading}-${index}`}
            className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] items-center gap-10 border-t border-border py-9 last:border-b"
          >
            <div
              className={`placeholder-hatch relative aspect-[4/3] overflow-hidden rounded-[10px] border border-border ${
                index % 2 === 1 ? 'md:order-2' : ''
              }`}
            >
              <img
                className="absolute inset-0 h-full w-full object-cover"
                src={section.imageUrl?.trim() || '/assets/beta.jpg'}
                alt={section.heading}
              />
            </div>
            <div className={index % 2 === 1 ? 'md:order-1' : ''}>
              {/* The kicker is author-supplied and says something; the `01 ·`
                  that used to prefix it did not — these sections are not steps
                  and reading them in order is not required. */}
              {section.kicker && (
                <p className="label-mono mb-3.5 text-muted-foreground">{section.kicker}</p>
              )}
              <h3 className="type-story mb-3.5">{section.heading}</h3>
              <p className="max-w-[52ch] whitespace-pre-line text-base leading-[1.7] text-muted-foreground text-pretty">
                {section.body}
              </p>
            </div>
          </article>
        ))}
      </section>

      <div className="rail">
        <h2 className="type-h2">{labels.upcomingHeading}</h2>
        <span className="rail-bar" />
        <Link href="/events" className="text-[13px] font-medium text-accent hover:underline">
          {t.see_more}
        </Link>
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
        </div>
      )}

      {past.docs.length > 0 && (
        <>
          {/*
            Past sessions are history, not decisions, so they are records rather
            than cards — the same component the events and forms pages use.
          */}
          <div className="rail">
            <h2 className="type-h2">{labels.pastHeading}</h2>
            <span className="rail-bar" />
            <Link href="/events" className="text-[13px] font-medium text-accent hover:underline">
              {labels.pastLink}
            </Link>
          </div>
          <div className="card-grid mb-[52px]">
            {past.docs.map((doc) => {
              const event = mapPayloadEvent(doc)
              return (
                <Record
                  key={event.id}
                  href={`/events/${event.id}`}
                  title={event.name}
                  tag={event.eventType || null}
                  meta={
                    <time dateTime={event.date_begin || event.date}>
                      {new Date(event.date_begin || event.date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </time>
                  }
                  imageUrl={event.posterUri || null}
                />
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
