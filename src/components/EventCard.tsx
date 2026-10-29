import React from 'react'
import Link from 'next/link'
import type { Event } from '@/libs/event'
import { deriveEventCta, eventStatus, eventWhen } from '@/libs/event'
import { Button } from '@/components/ui/button'
import PosterImage from './PosterImage'
import StatusMark from './StatusMark'
import { cn } from '@/libs/utils'
import { marqueeDuration } from '@/libs/marquee'

/**
 * The full card. See design.md § Components.
 *
 * Reserved for upcoming events — the only records where a poster earns its
 * place and the reader is making a decision. Everything else on the site is a
 * mini record. Two lists of events can deserve two different components; what
 * separates them is what the reader *does* with them.
 *
 * Sideways: the poster sits on the left in its own frame, the text on the
 * right. The height is fixed by the poster frame, so a long title or location
 * clamps instead of lengthening the card. Status takes the top right, where the
 * campus tag used to be, because the full location now sits under the title.
 */
export default function EventCard({
  event,
  className,
  ...props
}: { event: Event } & React.HTMLAttributes<HTMLElement>) {
  const cta = deriveEventCta(event)
  const when = eventWhen(event)

  /*
    Registration that has not opened yet used to be a live-ticking countdown —
    "Opens in 3d 4h 12s" — which forced the whole card to be a client component
    and spent the page's motion budget on every tile at once. The member only
    needs the date. Amber circle rather than the inert rule: it is a real state
    they should come back for, not a dead one.
  */
  const opensAt = event.registrationOpensAt || event.opens_at
  const opensMs = opensAt ? new Date(opensAt).getTime() : NaN
  const notYetOpen = Number.isFinite(opensMs) && opensMs > Date.now()

  const status = notYetOpen ? 'pending' : eventStatus(event)
  const statusLabel = notYetOpen
    ? `Opens ${new Date(opensMs).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
    : undefined

  // Rule 6: the primary action disappears when the state removes it — not
  // greyed out. A disabled button says you cannot act without saying why; a
  // status with no button says both.
  const showPrimary =
    cta && !cta.disabled && !notYetOpen && status !== 'live' && status !== 'closed'

  const label = (raw: string) => {
    if (raw === 'Register Now') return 'Register'
    if (raw === 'Waiting List') return 'Join waitlist'
    if (raw === 'Registration Closed') return 'Closed'
    return raw
  }

  // A group has no seat count of its own; each day does. No limit reads as infinite.
  const showCount = event.structure !== 'multi_day'

  return (
    <article
      className={cn('event-card', className)}
      data-group={event.structure === 'multi_day' ? '' : undefined}
      style={{ '--mq-dur': marqueeDuration(event.name) } as React.CSSProperties}
      {...props}
    >
      <div className="placeholder-hatch poster-slot event-poster">
        {event.posterUri ? (
          <PosterImage src={event.posterUri} sizes="(max-width: 640px) 128px, 160px" />
        ) : null}
      </div>

      <div className="event-main">
        <div className="event-body">
          <p className="event-overline">
            <span className="min-w-0">
              {when.date}
              {when.time ? <span className="at"> · {when.time}</span> : null}
            </span>
            <StatusMark status={status} label={statusLabel} />
          </p>
          <h3 className="event-title type-card-title"><span>{event.name}</span></h3>
          {event.venue ? (
            <p className="event-venue" style={{ '--mq-dur': marqueeDuration(event.venue) } as React.CSSProperties}>
              <span>{event.venue}</span>
            </p>
          ) : null}
          {event.eventType || showCount ? (
            <p className="event-meta">
              {event.eventType ? <span className="font-medium">{event.eventType}</span> : null}
              {event.eventType && showCount ? <span className="sep" /> : null}
              {showCount ? <span>{event.participantLimit ? `${event.participantCount ?? 0} / ${event.participantLimit}` : '∞'} participants</span> : null}
            </p>
          ) : null}
        </div>

        <div className="event-foot">
          {showPrimary ? (
            <Button asChild variant={cta.kind === 'register' ? 'default' : 'outline'}>
              <Link href={cta.href ?? `/events/${event.id}`}>{label(cta.label)}</Link>
            </Button>
          ) : null}
          <span className="flex-1" />
          <Link
            href={`/events/${event.id}`}
            aria-label={`See more: ${event.name}`}
            className="hit-area px-1.5 text-meta font-medium text-accent hover:underline whitespace-nowrap"
          >
            See more
          </Link>
        </div>
      </div>
    </article>
  )
}
