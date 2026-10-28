import React from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { mapPayloadEvent, formatEventDuration } from '@/libs/event'
import { confirmAttendance, declineAttendance, withdrawApplication } from './actions'
import { visibleEvent } from '@/libs/event-workflow'

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
  decision: 'confirm' | 'decline' | 'withdraw'
  message?: string
}) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/events/${eventId}/${decision}`)}`)
  }

  const doc = await visibleEvent(payload, eventId, user)
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
      decision === 'confirm' ? await confirmAttendance(eventId) : decision === 'withdraw' ? await withdrawApplication(eventId) : await declineAttendance(eventId)
    if (result.success) redirect(`/events/${eventId}`)
    redirect(`/events/${eventId}/${decision}?msg=${encodeURIComponent(result.message)}`)
  }

  return (
    <div className="max-w-[620px]">
      <Link
        href={`/events/${eventId}`}
        className="text-meta text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Back to the event
      </Link>

      <h1 className="type-h1 mb-3.5 mt-6 max-w-[24ch]">{event.name}</h1>

      {/* After the action runs the page comes back carrying `msg`; that outcome
          replaces the prompt, so the button is not offered a second time. The
          outcome is a record state now, so it wears the marker that says so
          rather than arriving as unmarked prose. */}
      {message ? (
        <div className="mb-7">
          <p role="alert" className="type-lead m-0 max-w-[54ch]">{message}</p>
        </div>
      ) : (
        <p className="type-lead mb-7 max-w-[54ch]">
          {decision === 'confirm'
            ? 'A place is yours if you want it. Confirm or decline so the coordinator can close the list.'
            : decision === 'withdraw' ? 'Withdraw this pending or waitlisted day. Your original application remains on record.'
            : 'Declining frees the place for the next student on the waitlist.'}
        </p>
      )}

      <dl className="spec-grid mb-7 gap-x-6 gap-y-3 border-y border-border py-[22px]">
        <dt>When</dt>
        <dd className="text-body text-foreground">{when}</dd>
        <dt>Where</dt>
        <dd className="text-body text-foreground">{event.venue || 'To be announced'}</dd>
      </dl>

      {!message && (
        <form action={apply}>
          <Button type="submit" variant={decision === 'confirm' ? 'default' : 'outline'}>
            {decision === 'confirm' ? 'Confirm my place' : decision === 'withdraw' ? 'Withdraw application' : 'I cannot attend'}
          </Button>
        </form>
      )}

      {/* Only on the confirm view. On the decline view the lead above already
          says the place goes to the waitlist, and saying it twice on one screen
          reads as a warning rather than reassurance. */}
      {decision === 'confirm' && !message && (
        <p className="mt-7 border-t border-border pt-[18px] text-meta leading-[1.7] text-muted-foreground">
          Declining frees the place for the next student on the waitlist. It does not affect future
          applications.
        </p>
      )}
    </div>
  )
}
