import { ResourceScheduling, registrationCutoff } from './resource-scheduling'
import { tagLabel, tagPath, tagRootLabel } from './tags'
import type { Payload } from 'payload'
import type { Event as PayloadEvent } from '@/payload-types'

// Lexical serialized editor state — the runtime shape of Payload's richText fields.
export type SerializedLexicalState = NonNullable<PayloadEvent['participant_detail']>

export type EventAction =
  | 'register'
  | 'waiting_list'
  | 'rejected'
  | 'participant'
  | 'reflect'
  | 'closed'
  | 'not_open'
  | 'feedback'
  | 'confirm'
  | 'declined'

export type EventUserStatus =
  | 'waiting_list'
  | 'participant'
  | 'rejected'
  | 'subscribed'
  | 'registered'
  | 'accepted'
  | 'confirmed'
  | 'declined'
  | 'withdrawn'
  | null
  | undefined
  | string

export type EventPhase = 'upcoming' | 'live' | 'ended'

export interface EventRegistrationStatus {
  isOpen?: boolean
  reason?: string
}

export interface EventCtaConfig {
  kind: EventAction
  label: string
  href?: string
  disabled?: boolean
  secondaryAction?: {
    label: string
    href: string
    kind: EventAction
  }
}

export interface Event {
  id: string
  name: string
  date: string
  venue: string
  /** Just the campus, unjoined — cards show it alone, detail pages show the full venue. */
  campus?: string
  details: string
  posterUri: string
  action: EventAction
  registrationOpen?: boolean
  participantCount?: number
  registrationStatus?: EventRegistrationStatus
  eventPhase?: EventPhase
  reflectionOpen?: boolean
  reflection_form?: string | { id: string }
  reflection_submitted?: boolean
  user_status?: EventUserStatus
  date_begin?: string
  date_end?: string
  subscription_form?: string | { id: string }
  opens_at?: string
  closes_at?: string
  status_override?: 'auto' | 'open' | 'closed'
  description?: string
  eventType?: string
  department?: string
  coordinatorName?: string
  participantLimit?: number
  registrationOpensAt?: string
  registrationClosesAt?: string
  participantDetail?: SerializedLexicalState | null
  loa_form?: string | { id: string }
}

export function deriveEventCta(
  event: Event,
  now: Date = new Date(),
): EventCtaConfig | null {
  const eventDate =
    event.date_end || event.date_begin || event.date || now.toISOString()
  const parsedEventDate = new Date(eventDate)
  const isPast =
    event.eventPhase === 'ended' ||
    (parsedEventDate instanceof Date && !isNaN(parsedEventDate.valueOf())
      ? parsedEventDate < now
      : false)

  const userStatus = event.user_status
  const scheduleStatus = ResourceScheduling.isOpen({
    opens_at: event.opens_at ?? event.registrationOpensAt,
    closes_at: registrationCutoff(event.date_end, event.closes_at ?? event.registrationClosesAt),
    status_override: event.status_override,
  })

  // Tri-branch: explicit overrides win; otherwise AND the legacy `registrationOpen`
  // flag (from the `is_registration_closed` checkbox) with the time-based schedule.
  const registrationOpen =
    event.status_override !== 'closed' &&
    (event.status_override === 'open' || (event.registrationOpen ?? true)) &&
    scheduleStatus.isOpen
  const reflectionOpen = event.reflectionOpen ?? false
  const reflectionPending =
    userStatus === 'participant' &&
    reflectionOpen &&
    event.reflection_submitted !== true

  const getFormId = (form: string | { id: string } | undefined): string | null => {
    if (!form) return null
    return typeof form === 'object' && form !== null ? form.id : (form as string)
  }

  if (reflectionPending && event.reflection_form) {
    const formId = getFormId(event.reflection_form)
    if (formId) {
      return {
        kind: 'reflect',
        label: 'Reflect',
        href: `/forms/${formId}`,
        disabled: false,
      }
    }
  }

  if (userStatus === 'participant') {
    return { kind: 'participant', label: 'Participant', disabled: true }
  }

  if (userStatus === 'accepted') {
    const loaFormId = getFormId(event.loa_form)
    return {
      kind: 'confirm',
      label: 'Confirm Attendance',
      disabled: false,
      secondaryAction: loaFormId
        ? { label: 'Decline (LOA)', href: `/forms/${loaFormId}`, kind: 'declined' }
        : { label: 'Decline', href: `/events/${event.id}/decline`, kind: 'declined' },
    }
  }

  if (userStatus === 'confirmed') {
    const loaFormId = getFormId(event.loa_form)
    return {
      kind: 'participant',
      // No tick in the string — this label is rendered beside a StatusMark,
      // whose check shape already carries "done and on record". Two ticks read
      // as a rendering fault.
      label: 'Confirmed',
      disabled: true,
      secondaryAction: loaFormId
        ? { label: 'Submit LOA', href: `/forms/${loaFormId}`, kind: 'declined' }
        : undefined,
    }
  }

  if (userStatus === 'waiting_list' || userStatus === 'subscribed') {
    return { kind: 'waiting_list', label: 'Waiting List', disabled: true }
  }

  if ((userStatus === 'rejected' || userStatus === 'declined') && !isPast) {
    return {
      kind: userStatus === 'rejected' ? 'rejected' : 'declined',
      label: userStatus === 'rejected' ? 'Rejected' : 'Declined',
      disabled: true,
    }
  }

  // Applicants who already applied must never see "Register" again, even if
  // registration is still open. Keep this check ABOVE the registrationOpen branch.
  if (userStatus === 'applicant') {
    return { kind: 'waiting_list', label: 'Pending Selection', disabled: true }
  }

  if (registrationOpen && !isPast) {
    return {
      kind: 'register',
      label: 'Register',
      href: `/events/${event.id}/apply`,
      disabled: false,
    }
  }

  return null
}

/**
 * The current user's registration status per event id, keyed by `String(eventId)`.
 * `events` has no `user_status` field — this is the real source for it.
 */
export async function getUserEventStatuses(
  payload: Payload,
  userId: string | number | null | undefined,
  eventIds: (string | number)[],
): Promise<Record<string, string>> {
  if (!userId || eventIds.length === 0) return {}

  const { docs } = await payload.find({
    collection: 'registrations',
    where: {
      and: [{ user: { equals: userId } }, { event: { in: eventIds } }],
    },
    depth: 0,
    pagination: false,
  })

  const statuses: Record<string, string> = {}
  for (const doc of docs as any[]) {
    const eventId = typeof doc.event === 'object' && doc.event !== null ? doc.event.id : doc.event
    if (doc.status) statuses[String(eventId)] = doc.status
  }
  return statuses
}

export function posterUrl(imageUrl: unknown): string {
  if (typeof imageUrl !== 'string' || !imageUrl.trim()) return '/assets/beta.jpg'

  const url = imageUrl.trim()
  const driveFile = url.match(/^https:\/\/(?:www\.)?drive\.google\.com\/file\/d\/([^/?#]+)/)
  // drive.google.com/uc?export=view redirects to drive.usercontent.google.com,
  // which serves the image with Cross-Origin-Resource-Policy: same-site —
  // browsers block it as an <img> src on any other origin. The lh3 thumbnail
  // host carries no such restriction (and is already in next.config.mjs's
  // image remotePatterns).
  return driveFile
    ? `https://lh3.googleusercontent.com/d/${encodeURIComponent(driveFile[1])}=w1000`
    : url
}

/**
 * Whether `posterUrl`'s output can be trusted to a plain `<img>` tag.
 *
 * lh3.googleusercontent.com serves images with no Cross-Origin-Resource-Policy
 * header, but Chrome's ORB (Opaque Response Blocking) still intermittently
 * blocks it as a hotlinked cross-origin `<img>` src — it loads fine on direct
 * navigation but fails silently when embedded. Routing it through next/image
 * (already configured for this host in next.config.mjs) fetches it server-side
 * instead, sidestepping the browser-side block entirely. Arbitrary external
 * poster URLs (any other host) stay on plain `<img>`, since next/image throws
 * for hosts not in `images.remotePatterns`.
 */
export function isOptimizedPosterUrl(url: string): boolean {
  if (url.startsWith('/')) return true
  try {
    return new URL(url).hostname === 'lh3.googleusercontent.com'
  } catch {
    return false
  }
}

export const mapPayloadEvent = (doc: any, userStatus?: EventUserStatus): Event => {
  const toDisplayText = (value: unknown): string => {
    if (typeof value === 'string') return value
    if (typeof value === 'number') return String(value)
    if (!value || typeof value !== 'object') return ''

    const record = value as Record<string, unknown>

    const preferred = [
      record.title_english,
      record.title_thai,
      record.name,
      record.label,
      record.slug,
    ]

    for (const candidate of preferred) {
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate
      }
    }

    return ''
  }

  /*
    Location is a tag that may hang under a campus tag: "Ramathibodi Hospital"
    → "Building 1, Room 301". `tagPath` renders the chain outermost-first and
    `tagRootLabel` picks off the campus, which is what the card's meta line
    shows on its own. A flat location with no parent is its own campus, which
    is the same thing the old three-column shape produced when building and
    room were blank.
  */
  let venue = ''
  let campus = ''
  if (doc.location && typeof doc.location === 'object') {
    venue = tagPath(doc.location)
    campus = tagRootLabel(doc.location) ?? ''
  } else if (typeof doc.location === 'string') {
    venue = doc.location
  }

  let coordinatorName = ''
  if (doc.coordinator && typeof doc.coordinator === 'object') {
    coordinatorName = `${doc.coordinator.name_english?.first_name || ''} ${doc.coordinator.name_english?.last_name || ''}`.trim()
  }

  return {
    id: doc.id,
    name: toDisplayText(doc.name) || 'Untitled Event',
    date: doc.date_begin || doc.date_end || doc.date || new Date().toISOString(),
    date_begin: doc.date_begin,
    date_end: doc.date_end,
    venue,
    campus,
    details: toDisplayText(doc.description) || (typeof doc.info === 'string' ? doc.info : '') || '',
    posterUri: posterUrl(doc.image_url),
    action: 'register',
    registrationOpen: !doc.is_registration_closed,
    participantCount: 0,
    eventPhase: (() => {
      const begin = doc.date_begin ? new Date(doc.date_begin) : null
      const end = doc.date_end ? new Date(doc.date_end) : null
      const now = new Date()
      if (end && now >= end) return 'ended'
      if (begin && now >= begin) return 'live'
      return 'upcoming'
    })() as EventPhase,
    reflectionOpen: doc.is_reflection_open,
    reflection_form: doc.reflection_form,
    subscription_form: doc.subscription_form,
    user_status: userStatus ?? doc.user_status,
    status_override: doc.status_override,
    description: toDisplayText(doc.description),
    /* Labels are editor copy now, so they render exactly as typed — the old
       humanise() would have title-cased whatever an editor entered. */
    eventType: tagLabel(doc.event_type) ?? '',
    department: tagLabel(doc.department) ?? '',
    coordinatorName,
    participantLimit: doc.participant_limit,
    registrationOpensAt: doc.registration_opens_at,
    registrationClosesAt: doc.registration_closes_at,
    registrationStatus: {
      isOpen: !doc.is_registration_closed,
    },
    opens_at: doc.registration_opens_at,
    closes_at: doc.registration_closes_at,
    participantDetail: doc.participant_detail,
    loa_form: doc.loa_form,
  }
}

export function formatEventDuration(
  event: Pick<Event, 'date' | 'date_begin' | 'date_end'>,
  options?: {
    locale?: string
    timeZone?: string
    includeWeekday?: boolean
    fallback?: string
  },
): string {
  const locale = options?.locale ?? 'en-GB'
  const timeZone = options?.timeZone ?? 'Asia/Bangkok'
  const fallback = options?.fallback ?? 'TBA'

  const startValue = event.date_begin || event.date
  if (!startValue) return fallback

  const startDate = new Date(startValue)
  if (Number.isNaN(startDate.getTime())) return fallback

  const dateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone,
  }

  if (options?.includeWeekday) {
    dateOptions.weekday = 'long'
  }

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }

  const startDateText = startDate.toLocaleDateString(locale, dateOptions)
  const startTimeText = startDate.toLocaleTimeString(locale, timeOptions)

  if (!event.date_end) {
    return `${startDateText}, ${startTimeText}`
  }

  const endDate = new Date(event.date_end)
  if (Number.isNaN(endDate.getTime())) {
    return `${startDateText}, ${startTimeText}`
  }

  const endDateText = endDate.toLocaleDateString(locale, dateOptions)
  const endTimeText = endDate.toLocaleTimeString(locale, timeOptions)

  if (startDateText === endDateText) {
    return `${startDateText}, ${startTimeText} - ${endTimeText}`
  }

  return `${startDateText} ${startTimeText} - ${endDateText} ${endTimeText}`
}

/* ── Chart helpers ───────────────────────────────────────────────────────── */

/**
 * Campus, abbreviated for the card chip. The field is a free string, so match
 * loosely and fall back to the first word rather than printing a paragraph into
 * a chip that is thirty pixels wide.
 */
export function campusShort(campus?: string | null): string {
  if (!campus) return ''
  const c = campus.toLowerCase()
  if (c.includes('chakri') || c.includes('cnmi') || c.includes('naruebodindra')) return 'CNMI'
  if (c.includes('phayathai') || c.includes('pyt')) return 'PYT'
  const first = campus.trim().split(/\s+/)[0]
  return first.length > 6 ? `${first.slice(0, 5)}…` : first
}

/**
 * One event, one status — the thing a member decides on. See design.md.
 *
 * Deliberately not a 1:1 map of EventAction: several actions collapse to the
 * same decision, and `live` outranks everything because during a session there
 * is nothing left to register for.
 */
export function eventStatus(
  event: Pick<Event, 'eventPhase' | 'registrationOpen' | 'user_status' | 'status_override'>,
): 'open' | 'live' | 'waitlist' | 'closed' | 'cancelled' {
  if (event.user_status === 'withdrawn') return 'cancelled'
  if (event.eventPhase === 'live') return 'live'
  if (event.eventPhase === 'ended') return 'closed'
  if (event.status_override === 'closed') return 'closed'
  if (event.user_status === 'waiting_list') return 'waitlist'
  if (event.status_override === 'open') return 'open'
  return event.registrationOpen ? 'open' : 'closed'
}

/**
 * `Sun 10 May` + `08:30`, or a day range when the event spans days. Midnight is
 * treated as "all day" rather than printed as a time nobody set.
 */
export function eventWhen(
  event: Pick<Event, 'date' | 'date_begin' | 'date_end'>,
  locale = 'en-GB',
): { date: string; time: string } {
  const start = new Date(event.date_begin || event.date)
  if (Number.isNaN(start.getTime())) return { date: '', time: '' }

  const end = event.date_end ? new Date(event.date_end) : null
  const sameDay =
    !end || Number.isNaN(end.getTime()) || start.toDateString() === end.toDateString()

  const timeZone = 'Asia/Bangkok'

  const day = (d: Date, withWeekday: boolean) =>
    d.toLocaleDateString(locale, {
      ...(withWeekday ? { weekday: 'short' as const } : {}),
      day: 'numeric',
      month: 'short',
      timeZone,
    })

  if (!sameDay && end) {
    return { date: `${day(start, false)} – ${day(end, false)}`, time: '' }
  }

  const time = start.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  })
  return { date: day(start, true), time: time === '00:00' ? 'all day' : time }
}
