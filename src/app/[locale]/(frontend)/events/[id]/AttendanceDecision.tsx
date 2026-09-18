import React from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import StatusMark from '@/components/StatusMark'
import { mapPayloadEvent, formatEventDuration } from '@/libs/event'
import { confirmAttendance, declineAttendance } from './actions'

/**
 * Landing page for the confirm/decline links in the acceptance email
 * (`/events/:id/confirm|decline?registrationId=…`). The registrationId in the
 * URL is informational only — the action resolves the registration from the
 * logged-in user, so a forwarded email can't act on someone else's row.
 *
 * The decision is behind a POST button rather than applied on GET so that email
 * clients and link scanners can't confirm or decline by prefetching.
 */
export async function AttendanceDecision({
  eventId,
  decision,
  message,
}: {
  eventId: string
  decision: 'confirm' | 'decline'
  message?: string
}) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/events/${eventId}/${decision}`)}`)
  }

  const doc = await payload.findByID({ collection: 'events', id: eventId, depth: 2 }).catch(() => null)
  if (!doc) notFound()

  const event = mapPayloadEvent(doc)
  const when = formatEventDuration(event, {
    locale: 'en-GB',
    timeZone: 'Asia/Bangkok',
    includeWeekday: true,
    fallback: 'To be announced',
  })

  const apply = async () => {
    'use server'
    const result =
      decision === 'confirm' ? await confirmAttendance(eventId) : await declineAttendance(eventId)
    redirect(`/events/${eventId}/${decision}?msg=${encodeURIComponent(result.message)}`)
  }

  return (
    <div className="max-w-[620px]">
      <Link
        href={`/events/${eventId}`}
        className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Back to the event
      </Link>

      {/* One of the two eyebrows left on the site that carry real content —
          this one says which of the two decisions you arrived at. */}
      <p className={`eyebrow mb-3.5 mt-6 ${decision === 'confirm' ? 'text-success' : 'text-muted-foreground'}`}>
        {decision === 'confirm' ? "You're accepted" : 'Decline your place'}
      </p>
      <h1 className="type-h1 mb-3.5 max-w-[24ch]">{event.name}</h1>

      {/* After the action runs the page comes back carrying `msg`; that outcome
          replaces the prompt, so the button is not offered a second time. The
          outcome is a record state now, so it wears the marker that says so
          rather than arriving as unmarked prose. */}
      {message ? (
        <div className="mb-7">
          <StatusMark
            status={decision === 'confirm' ? 'complete' : 'cancelled'}
            label={decision === 'confirm' ? 'Place confirmed' : 'Place released'}
            className="mb-2.5"
          />
          <p className="type-lead m-0 max-w-[54ch]">{message}</p>
        </div>
      ) : (
        <p className="type-lead mb-7 max-w-[54ch]">
          {decision === 'confirm'
            ? 'A place is yours if you want it. Confirm or decline so the coordinator can close the list.'
            : 'Declining frees the place for the next student on the waitlist.'}
        </p>
      )}

      <dl className="spec-grid mb-7 gap-x-6 gap-y-3 border-y border-border py-[22px]">
        <dt>When</dt>
        <dd className="text-[15px] text-foreground">{when}</dd>
        <dt>Where</dt>
        <dd className="text-[15px] text-foreground">{event.venue || 'To be announced'}</dd>
      </dl>

      {!message && (
        <form action={apply}>
          <Button type="submit" size="lg" variant={decision === 'confirm' ? 'default' : 'outline'}>
            {decision === 'confirm' ? 'Confirm my place' : 'I cannot attend'}
          </Button>
        </form>
      )}

      {/* Only on the confirm view. On the decline view the lead above already
          says the place goes to the waitlist, and saying it twice on one screen
          reads as a warning rather than reassurance. */}
      {decision === 'confirm' && !message && (
        <p className="mt-7 border-t border-border pt-[18px] text-[13px] leading-[1.7] text-muted-foreground">
          Declining frees the place for the next student on the waitlist. It does not affect future
          applications.
        </p>
      )}
    </div>
  )
}
