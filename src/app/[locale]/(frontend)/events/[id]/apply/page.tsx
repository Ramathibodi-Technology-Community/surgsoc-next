import React from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/libs/auth/current-user'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import PayloadForm from '@/components/PayloadForm'
import { submitEventApplication } from '../actions'
import { checkUserActionGate } from '@/libs/user-action-gate'

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
        className="text-[15px] font-medium text-accent transition-colors hover:text-accent/80"
      >
        Back to the event
      </Link>
    </div>
  )
}

export default async function ApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload({ config })

  // Fetch user early — needed for gate check
  const user = await getCurrentUser(payload)

  const event = await payload.findByID({
    collection: 'events',
    id: id,
  })

  if (!event) {
    notFound()
  }

  // Unified gate — auth, profile, form blocking, scheduling
  const gate = await checkUserActionGate(payload, user, {
    resource: event,
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
        className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Back to the event
      </Link>

      <h1 className="type-h1 mb-3 mt-6 max-w-[24ch]">{event.name}</h1>
      <p className="type-lead mb-[34px] max-w-[56ch]">
        Register for this session by filling in the form below.
      </p>

      <div className="panel p-5 sm:p-[30px]">
        <PayloadForm form={form as any} onSubmit={submitEventApplication.bind(null, event.id)} user={user} />
      </div>
    </div>
  )
}
