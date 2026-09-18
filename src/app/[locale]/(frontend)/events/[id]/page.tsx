import React from 'react'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { mapPayloadEvent, getUserEventStatuses } from '@/libs/event'
import { hasPermission } from '@/libs/permissions'
import type { User as PayloadUser } from '@/payload-types'
import { deriveEventCta, eventStatus, eventWhen } from '@/libs/event'
import StatusMark, { type StatusKey } from '@/components/StatusMark'
import { formatEventDuration } from '@/libs/event'
import { getDictionary } from '@/i18n/server'
import { Locale } from '@/i18n/config'
import { Button } from '@/components/ui/button'
import { headers } from 'next/headers'
import { checkUserActionGate } from '@/libs/user-action-gate'
import EventActions from './EventActions'
import { RichText } from '@payloadcms/richtext-lexical/react'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const payload = await getPayload({ config })
  const eventDoc = await payload.findByID({ collection: 'events', id }).catch(() => null)
  // Local API bypasses the is_visible gate — don't title the tab with a hidden event.
  const visible = eventDoc && eventDoc.is_visible !== false
  return {
    title: visible ? `${eventDoc.name} | RASS` : 'Event | RASS',
    description:
      visible && eventDoc.description
        ? String(eventDoc.description).slice(0, 155)
        : 'Event details',
  }
}

export default async function EventPage({ params }: { params: Promise<{ id: string, locale: string }> }) {
  const { id, locale } = await params as { id: string, locale: Locale }
  const t = (await getDictionary(locale)).events
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  // overrideAccess: true is needed so `participant_detail` (field-access-gated
  // to staff in the REST API) is available here. The UI still only renders
  // it when `event.user_status === 'confirmed'`.
  const eventDoc = await payload.findByID({
    collection: 'events',
    id: id,
    depth: 2,
    overrideAccess: true,
  })

  if (!eventDoc) {
    notFound()
  }

  // `overrideAccess: true` above skips the collection's is_visible gate, so the
  // page has to re-apply it — otherwise a hidden event is public to anyone
  // holding the URL.
  if (eventDoc.is_visible === false && !hasPermission(user as PayloadUser, 'manage_events')) {
    notFound()
  }

  const statuses = await getUserEventStatuses(payload, user?.id, [eventDoc.id])
  const event = mapPayloadEvent(eventDoc, statuses[String(eventDoc.id)])
  const cta = deriveEventCta(event)

  // Unified gate: auth → profile → form blocking → scheduling
  const gate = await checkUserActionGate(payload, user, {
    resource: {
      opens_at: event.opens_at,
      closes_at: event.closes_at,
      status_override: event.status_override,
    },
  })

  /*
    What the aside offers, and what it says about why.

    `label` and `note` are separate because the gate returns sentences —
    "Please complete your profile first: phone number, student ID." — and a
    sentence is an explanation, not a button label. It was being used as both:
    the control read as a paragraph, and the reason it gave was then repeated
    underneath. Labels name what happens; the note carries the detail.
  */
  const actionConfig = (() => {
    if (!gate.allowed) {
      const isClickable = gate.reason === 'form_blocked' || gate.reason === 'profile_incomplete'
      if (isClickable) {
        return {
          label:
            gate.reason === 'profile_incomplete'
              ? t.actions.complete_profile
              : t.actions.open_required_form,
          note: gate.message,
          href: gate.redirect ?? null,
          disabled: false,
          kind: 'blocked',
        }
      }
      return {
        label: t.actions.closed,
        note: gate.message,
        href: null,
        disabled: true,
        kind: 'closed',
      }
    }

    if (cta) {
      // `t.actions` only has translations for a subset of EventAction kinds;
      // fall back to the label from deriveEventCta for the rest. The cast is
      // necessary because EventAction is wider than the dictionary keys.
      const localizedLabel = (t.actions as Record<string, string | undefined>)[cta.kind]
      return {
        label: localizedLabel || cta.label,
        note: null,
        href: cta.href ?? null,
        disabled: cta.disabled ?? false,
        kind: cta.kind as string,
      }
    }

    if (event.eventPhase === 'ended' || new Date(event.date) < new Date()) {
      return {
        label: t.actions.feedback,
        note: null,
        href: `/events/${event.id}/reviews`,
        disabled: false,
        kind: 'feedback',
      }
    }

    // Reached when the gate lets you through but nothing is open and you hold
    // no place. "See Details" was the label here, on a page that already is the
    // details — say the actual standing instead.
    return {
      label: t.actions.closed,
      note: null,
      href: null,
      disabled: true,
      kind: 'none',
    }
  })()

  /*
    At most one filled button per view. `register` and `reflect` are each the
    one thing their view is for, so they fill; `feedback` and `blocked` are
    outlined.

    `blocked` was filled red. Filled red is reserved for irreversible deletion,
    which this site has none of — and "finish your profile first" is a signpost,
    not a destruction. Spending the strongest colour on it leaves nothing louder
    for anything that actually warrants it.
  */
  const getButtonVariant = (kind: string): 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' => {
    switch (kind) {
      case 'register': return 'default'
      case 'reflect': return 'default'
      case 'feedback': return 'outline'
      case 'blocked': return 'outline'
      default: return 'default'
    }
  }

  /*
    A CTA kind that removes the action does not get a greyed button — it gets
    the user's standing, said in words. A disabled button tells you that you
    cannot act without telling you why; the status vocabulary tells you why and
    nothing else.

    Shape carries the kind of state: check for settled, circle for something
    still live, cross for terminated, rule for inert.
  */
  const standingStatus = (kind: string): StatusKey => {
    switch (kind) {
      case 'participant': return 'complete'
      case 'waiting_list': return 'waitlist'
      case 'rejected':
      case 'declined': return 'cancelled'
      default: return 'closed'
    }
  }

  // Only a real action renders a control. Everything else is a standing.
  const hasAction = Boolean(actionConfig.href) && !actionConfig.disabled

  /*
    The note only ever comes from the gate, which is the only thing here that
    knows something the status word does not. It used to be derived as
    `t.actions[kind] || t.actions.closed`, which printed "Registration Closed"
    directly beneath a button already reading "Registration Closed" — and, for a
    confirmed participant, printed "Registration Closed" beneath "Confirmed",
    which is not merely redundant but wrong.
  */
  const standingNote = actionConfig.note

  const localeStr = locale === 'th' ? 'th-TH' : 'en-GB'
  const durationValue = formatEventDuration(event, {
    locale: localeStr,
    timeZone: 'Asia/Bangkok',
    includeWeekday: true,
    fallback: t.tba,
  })

  // Spec rows are built up first so the markup stays a single map — the design
  // shows one definition list, not a grid of cards, and empty fields drop out.
  const specs: { label: string; value: React.ReactNode }[] = [
    {
      label: t.duration,
      value: <time dateTime={event.date_begin || event.date}>{durationValue}</time>,
    },
    { label: t.venue, value: event.venue || t.tba },
  ]
  if (event.coordinatorName) specs.push({ label: t.coordinator, value: event.coordinatorName })
  specs.push({
    label: t.participant_limit,
    value: event.participantLimit ? String(event.participantLimit) : t.unlimited,
  })
  if (event.registrationOpensAt) {
    specs.push({
      label: t.registration_opens,
      value: new Date(event.registrationOpensAt).toLocaleString(localeStr, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Bangkok',
      }),
    })
  }

  return (
    <>
      <Link href="/events" className="text-[13px] text-muted-foreground hover:text-foreground">
        ← {t.back_to_events}
      </Link>

      {/*
        The card at full size: same slots, same order, more room — so arriving
        from a card reads as zooming rather than navigating. Date left, status
        right, then the title. The campus chip is gone: campus is already in the
        venue row below, so the chip was saying it twice.
      */}
      <div className="mt-6 mb-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-2">
        <p className="text-[13px] font-medium tabular-nums text-secondary-foreground">
          {eventWhen(event).date}
          {eventWhen(event).time ? (
            <span className="font-normal text-muted-foreground"> · {eventWhen(event).time}</span>
          ) : null}
        </p>
        <span className="ml-auto">
          <StatusMark status={eventStatus(event)} />
        </span>
      </div>

      <h1 className="type-h1 mb-3">{event.name}</h1>

      <div className="mb-7 flex flex-wrap gap-x-3 gap-y-1.5 text-[13px] text-muted-foreground">
        {event.eventType && <span className="font-medium text-accent">{event.eventType}</span>}
        {event.eventType && event.department ? <span aria-hidden="true">·</span> : null}
        {event.department && <span>{event.department}</span>}
      </div>

      <div className="placeholder-hatch relative mb-9 aspect-[21/8] overflow-hidden rounded-[10px] border border-border">
        <img
          className="absolute inset-0 h-full w-full object-cover"
          alt={event.name}
          src={event.posterUri}
        />
      </div>

      {/*
        Detail first, action second. The registration card is narrow and sticks
        to the viewport, so the CTA stays reachable while the description scrolls.
      */}
      <article className="grid items-start gap-11 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          {/* Events without a description skip the heading too — an empty
              section label above a blank gap reads as a rendering fault. */}
          {/* These were captions — 12px, muted, sitting where a heading goes.
              A caption that imitates hierarchy carries none of it: the page had
              one h1 and no h2 at all, so nothing here was navigable by heading.
              Weight and size carry it now, and they are real headings. */}
          {event.details?.trim() && (
            <>
              <h2 className="type-h2 mb-4">{t.about_event}</h2>
              <p className="mb-8 max-w-[60ch] whitespace-pre-wrap text-base leading-[1.75] text-secondary-foreground text-pretty">
                {event.details}
              </p>
            </>
          )}

          {event.user_status === 'confirmed' && event.participantDetail && (
            <div className="mt-7 rounded-[10px] border border-primary/40 bg-primary/10 p-5">
              <h2 className="panel-title mb-3 text-accent">Participant details</h2>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <RichText data={event.participantDetail as React.ComponentProps<typeof RichText>['data']} />
              </div>
            </div>
          )}

          <dl className="spec-grid gap-x-6 gap-y-3 border-t border-border pt-6">
            {specs.map((spec) => (
              <React.Fragment key={spec.label}>
                <dt className="whitespace-nowrap">{spec.label}</dt>
                <dd className="text-[15px] text-foreground">{spec.value}</dd>
              </React.Fragment>
            ))}
          </dl>

          {hasPermission(user as PayloadUser, 'manage_events') && (
            <div className="mt-7 border-t border-border pt-5">
              <Link
                href={`/events/${event.id}/applicants`}
                className="text-[13px] font-medium text-accent hover:text-accent/80"
              >
                Coordinator view · registration list →
              </Link>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-3.5 rounded-[10px] border border-border bg-card p-[22px] lg:sticky lg:top-24">
          {actionConfig.kind === 'confirm' ? (
            <EventActions
              eventId={event.id}
              primaryAction={{
                label: actionConfig.label,
                kind: actionConfig.kind,
              }}
              secondaryAction={cta?.secondaryAction}
            />
          ) : hasAction ? (
            <Button
              asChild
              className="h-auto w-full py-[15px] text-[15px]"
              variant={getButtonVariant(actionConfig.kind || 'default')}
            >
              <Link href={actionConfig.href!}>{actionConfig.label}</Link>
            </Button>
          ) : (
            /*
              No greyed button. The standing is the answer, and it is the same
              marker-plus-word this reader has already learned from the cards —
              so "Confirmed" here reads identically to "Confirmed" on a record.
            */
            <StatusMark
              status={standingStatus(actionConfig.kind || 'none')}
              label={actionConfig.label}
              className="justify-center py-1 text-[15px]"
            />
          )}

          {/*
            A standing can still leave exactly one thing to do — a confirmed
            participant who needs to file leave. That action used to be dropped
            on the floor: the branch above it tested for a CTA kind that
            `deriveEventCta` never returns, so the LOA link was computed and
            then never rendered.

            `gate.allowed` guards it. When the *gate* is what removed the
            primary, the CTA's actions were never on offer in the first place,
            and rendering its secondary alone leaves an accepted member looking
            at "Registration closed" above a lone Decline button — one half of a
            decision, and the wrong half.
          */}
          {gate.allowed && !hasAction && actionConfig.kind !== 'confirm' && cta?.secondaryAction?.href && (
            <Button asChild variant="outline" className="h-auto w-full py-3 text-[15px]">
              <Link href={cta.secondaryAction.href}>{cta.secondaryAction.label}</Link>
            </Button>
          )}

          {standingNote && (
            <p className="text-center text-[13px] leading-relaxed text-muted-foreground">
              {standingNote}
            </p>
          )}

          {/* Capacity sits beside the button, where it changes a decision —
              never on the card, where it is arithmetic the reader must do. */}
          {event.participantLimit ? (
            <>
              <div className="h-px bg-border" />
              <div className="flex justify-between gap-3">
                <span className="meta-mono">{t.participant_limit}</span>
                <span className="meta-mono font-medium text-secondary-foreground">
                  {event.participantCount ?? 0} / {event.participantLimit}
                </span>
              </div>
            </>
          ) : null}
        </aside>
      </article>
    </>
  )
}
