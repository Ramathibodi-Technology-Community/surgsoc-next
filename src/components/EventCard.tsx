import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Event } from '@/libs/event'
import { deriveEventCta, eventStatus, eventWhen, campusShort } from '@/libs/event'
import { Button } from '@/components/ui/button'
import StatusMark from './StatusMark'
import { cn } from '@/libs/utils'

/**
 * The full card. See design.md § Components.
 *
 * Reserved for upcoming events — the only records where a poster earns its
 * place and the reader is making a decision. Everything else on the site is a
 * mini record. Two lists of events can deserve two different components; what
 * separates them is what the reader *does* with them.
 *
 * Capacity is deliberately absent: `Open` and `Waitlist` are what a member acts
 * on, `18 / 30` is arithmetic they would have to do themselves. The number
 * lives on the detail page, next to the button it changes.
 */
export default function EventCard({
  event,
  className,
  ...props
}: { event: Event } & React.HTMLAttributes<HTMLElement>) {
  const cta = deriveEventCta(event)
  const when = eventWhen(event)
  const campus = campusShort(event.campus)

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

  return (
    <article className={cn('event-card', className)} {...props}>
      <div className="placeholder-hatch event-poster">
        {event.posterUri ? (
          <Image
            className="object-cover"
            alt=""
            src={event.posterUri}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : null}
        <span className="event-badge">
          <StatusMark status={status} label={statusLabel} />
        </span>
      </div>

      <div className="event-body">
        <p className="event-overline">
          <span className="min-w-0">
            {when.date}
            {when.time ? <span className="at"> · {when.time}</span> : null}
          </span>
          {campus ? <span className="campus-chip">{campus}</span> : null}
        </p>
        <h3 className="type-card-title text-[1.0625rem] leading-[1.24]">{event.name}</h3>
      </div>

      <div className="event-foot">
        {showPrimary ? (
          <Button asChild size="sm" variant={cta.kind === 'register' ? 'default' : 'outline'}>
            <Link href={cta.href ?? `/events/${event.id}`}>{label(cta.label)}</Link>
          </Button>
        ) : null}
        <span className="flex-1" />
        <Link
          href={`/events/${event.id}`}
          className="px-1.5 text-[13px] font-medium text-accent hover:underline"
        >
          See more
        </Link>
      </div>
    </article>
  )
}
