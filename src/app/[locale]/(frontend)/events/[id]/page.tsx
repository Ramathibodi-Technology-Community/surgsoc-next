import { canManageEvent, eventDays, visibleEvent } from '@/libs/event-workflow'
import { assignmentState } from '@/libs/form-assignment-lifecycle'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/libs/auth/current-user'
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { notFound } from 'next/navigation'
import { mapPayloadEvent, getUserEventStatuses } from '@/libs/event'
import { getSiteSettings } from '@/libs/site-settings'
import { deriveEventCta } from '@/libs/event'
import StatusMark, { type StatusKey } from '@/components/StatusMark'
import { getDictionary } from '@/i18n/server'
import { Locale } from '@/i18n/config'
import { Button } from '@/components/ui/button'
import { checkUserActionGate } from '@/libs/user-action-gate'
import EventActions from './EventActions'
import EventView from '@/components/events/EventView'
import MemberSessions, { type MemberSession } from '@/components/events/MemberSessions'
import { sessionRegistration } from '@/libs/event-application'
import { idOf } from '@/libs/form-assignment-lifecycle'
import { formatStamp } from '@/libs/utils'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const payload = await getPayload({ config })
  const eventDoc = await visibleEvent(payload, id)
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

export default async function EventPage({ params, searchParams }: { params: Promise<{ id: string, locale: string }>; searchParams: Promise<{ applied?: string }> }) {
  const { id, locale } = await params as { id: string, locale: Locale }
  const t = (await getDictionary(locale)).events
  const payload = await getPayload({ config })
  const user = await getCurrentUser(payload)

  const eventDoc = await visibleEvent(payload, id, user)
  if (!eventDoc) notFound()
  const days = eventDoc.event_structure === 'multi_day' ? await eventDays(payload, eventDoc.id, canManageEvent(user, eventDoc)) : []
  const statuses = await getUserEventStatuses(payload, user?.id, [eventDoc.id, ...days.map(day => day.id)])
  const event = mapPayloadEvent(eventDoc, statuses[String(eventDoc.id)])
  const showAcknowledgement = (await searchParams).applied === '1' && !!event.user_status
  const hasConfirmedDay = days.some(day => statuses[String(day.id)] === 'confirmed')
  const assignments = user ? (await payload.find({ collection: 'form-assignments', where: { and: [{ user: { equals: user.id } }, { source_event: { in: [eventDoc.id, ...days.map(day => day.id)] } }] }, pagination: false, depth: 1 })).docs.filter(assignment => ['pending', 'overdue'].includes(assignmentState(assignment))) : []
  const cta = deriveEventCta(event)
  const isGroup = eventDoc.event_structure === 'multi_day'
  const memberSessions: MemberSession[] = days.map(day => {
    const assignment = assignments.find(row => String(idOf(row.source_event)) === String(day.id))
    return {
      day,
      status: statuses[String(day.id)],
      open: Date.parse(day.date_begin) > Date.now() && sessionRegistration(day, eventDoc).isOpen,
      opensAt: sessionRegistration(day, eventDoc).opens,
      reflection: assignment ? { id: assignment.id, formId: Number(idOf(assignment.form)), deadline: assignment.deadline } : null,
    }
  })
  const mySessions = memberSessions.filter(row => row.status)
  const canAddMore = memberSessions.some(row => !row.status && row.open)
  const photos = (eventDoc.gallery_links ?? []).filter(link => link.url)
  const { eventDetailImageDisplay } = await getSiteSettings()

  // Unified gate: auth → profile → form blocking → scheduling
  const gate = await checkUserActionGate(payload, user, {
    resource: {
      opens_at: event.opens_at,
      closes_at: event.closes_at,
      date_end: event.date_end,
      is_registration_closed: !event.registrationOpen,
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
    if (!gate.allowed && (!event.user_status || cta?.kind === 'register')) {
      // A signed-out visitor always fails the gate's first check
      // (`unauthenticated`), even on an event that is otherwise open — the
      // gate has no way to know what a logged-in user would see. `cta` was
      // derived above from the event alone, so for a visitor (no user_status)
      // it already tells us whether registration would be open: send them to
      // sign in instead of reporting the event closed. A genuinely closed
      // event still falls through to the `closed` branch below, since cta is
      // then null.
      if (gate.reason === 'unauthenticated' && cta?.kind === 'register') {
        return {
          label: t.actions.sign_in,
          note: null,
          href: `/login?redirect=${encodeURIComponent(`/${locale}/events/${event.id}`)}`,
          disabled: false,
          kind: 'sign_in',
        }
      }
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

    if (event.eventPhase === 'ended') {
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

  return (
    <EventView
      event={event}
      locale={locale}
      t={t}
      imageDisplay={eventDetailImageDisplay}
      isGroup={eventDoc.event_structure === 'multi_day'}
      sessionsSlot={isGroup && user ? <MemberSessions eventId={eventDoc.id} sessions={memberSessions} t={t} locale={locale} /> : undefined}
      sessions={days.map(day => ({ id: day.id, name: day.name, date_begin: day.date_begin, href: `/events/${day.id}`, event: mapPayloadEvent(day, statuses[String(day.id)]), status: statuses[String(day.id)] }))}
      showJoining={event.user_status === 'confirmed' || hasConfirmedDay}
      titleAction={canManageEvent(user, eventDoc) ? <Button asChild variant="outline"><Link href={`/events/${event.id}/edit`}><Pencil />{t.staff.edit_event}</Link></Button> : undefined}
      top={<>
        {showAcknowledgement && <p role="status" className="mt-5 rounded-md border border-success/30 bg-success/10 p-4 text-body">{t.application_recorded}</p>}
      </>}
      after={<>
        {photos.length > 0 && event.eventPhase === 'ended' && <section className="my-7 space-y-3"><h2 className="type-h2">{t.session.photos}</h2><ul className="space-y-1.5">{photos.map(link => <li key={link.id}><a className="text-accent" href={link.url} target="_blank" rel="noopener noreferrer">{link.title}</a></li>)}</ul></section>}
        {assignments.length > 0 && <section className="my-7 space-y-3"><h2 className="type-h2">{t.reflection}</h2>{assignments.map(assignment => <Link className="block text-accent" key={assignment.id} href={`/forms/${typeof assignment.form === 'object' ? assignment.form.id : assignment.form}`}>{typeof assignment.form === 'object' ? assignment.form.title : t.reflection}</Link>)}</section>}
      </>}
      aside={
        <div className="flex flex-col gap-3.5 rounded-md border border-border bg-card p-[22px]">
          {isGroup && mySessions.length > 0 ? (
            <>
              <h3 className="text-body font-semibold">{t.session.your_application}</h3>
              <p className="text-meta text-muted-foreground">{t.session.sent_on.replace('{count}', String(mySessions.length))}</p>
              <p className="text-meta text-muted-foreground">{t.session.answers_locked}</p>
              {canAddMore && <Button asChild className="w-full"><Link href={`/events/${event.id}/apply`}>{t.session.apply_more}</Link></Button>}
            </>
          ) : actionConfig.kind === 'confirm' ? (
            <EventActions eventId={event.id} primaryAction={{ label: actionConfig.label, kind: actionConfig.kind }} secondaryAction={cta?.secondaryAction} />
          ) : hasAction ? (
            <Button asChild className="w-full" variant={getButtonVariant(actionConfig.kind || 'default')}>
              <Link href={actionConfig.href!}>{actionConfig.label}</Link>
            </Button>
          ) : (
            // No greyed button: the standing is the answer, in the same marker-plus-word the cards use.
            <StatusMark status={standingStatus(actionConfig.kind || 'none')} label={actionConfig.label} className="justify-center py-1 text-body" />
          )}

          {/* A standing can still leave one thing to do (a confirmed participant filing leave).
              `gate.allowed` guards it: when the gate removed the primary, its secondary alone is the wrong half of a decision. */}
          {(gate.allowed || !!event.user_status) && !hasAction && actionConfig.kind !== 'confirm' && cta?.secondaryAction?.href && (
            <Button asChild variant="outline" className="h-auto w-full py-3 text-body">
              <Link href={cta.secondaryAction.href}>{cta.secondaryAction.kind === 'withdraw' ? t.withdraw : cta.secondaryAction.label}</Link>
            </Button>
          )}

          {standingNote && <p className="text-center text-meta leading-relaxed text-muted-foreground">{standingNote}</p>}

          {/* Capacity sits beside the button, where it changes a decision. */}
          {event.participantLimit ? (
            <>
              <div className="h-px bg-border" />
              <div className="flex justify-between gap-3">
                <span className="type-figure">{t.participant_limit}</span>
                <span className="type-figure font-medium text-secondary-foreground">{event.participantCount ?? 0} / {event.participantLimit}</span>
              </div>
            </>
          ) : null}
        </div>
      }
    />
  )
}
