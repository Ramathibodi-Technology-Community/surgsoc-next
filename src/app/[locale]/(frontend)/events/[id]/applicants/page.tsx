import React from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/libs/auth/current-user'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ApplicantPoolManager from '@/components/ApplicantPoolManager'
import { hasPermission } from '@/libs/permissions'
import type { User } from '@/payload-types'
import { getDictionary } from '@/i18n/server'
import { Locale } from '@/i18n/config'

export default async function ApplicantsPage({ params }: { params: Promise<{ id: string, locale: string }> }) {
  const { id, locale } = await params as { id: string, locale: Locale }
  const t = (await getDictionary(locale)).events

  const payload = await getPayload({ config })
  const user = await getCurrentUser(payload)

  if (!user) {
    redirect('/login')
  }

  // Fetch event
  const event = await payload.findByID({
    collection: 'events',
    id,
  })

  // Same rule as the batch route this page drives: the event owner, or anyone
  // who may manage events. Payload may return owner as an ID or a populated object.
  const ownerId = typeof event.owner === 'object' && event.owner !== null
    ? (event.owner as { id: string | number }).id
    : event.owner
  const isAuthorized =
    String(ownerId) === String(user.id) || hasPermission(user as User, 'manage_events')

  if (!isAuthorized) {
    redirect(`/events/${id}`)
  }

  const participantLimit =
    typeof (event as { participant_limit?: unknown }).participant_limit === 'number'
      ? ((event as { participant_limit?: number }).participant_limit ?? 0)
      : 0

  // Include every registration status so auto-confirmed attendees remain visible.
  // payload.find returns paginated docs
  const { docs: applicants } = await payload.find({
    collection: 'registrations',
    where: {
      event: { equals: id },
    },
    depth: 2, // Populate user details
    limit: 1000, // Fetch up to 1000 applicants
  })

  // Transform to simpler interface for client component if needed,
  // currently passing docs directly as they match expectations mostly
  const formattedApplicants = applicants.map(app => ({
      id: String(app.id),
      user: app.user,
      status: app.status ?? 'applicant',
      createdAt: app.createdAt,
      submission: app.submission
  }))

  return (
    <>
      <Link
        href={`/events/${id}`}
        className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        ← {t.applicants.back_to_event}
      </Link>

      <div className="mb-9 mt-6 flex flex-wrap items-end justify-between gap-6">
        <h1 className="type-h1 max-w-[26ch]">{t.applicants.registrations_for} · {event.name}</h1>
        {/* label-mono stays here: this one genuinely is a field caption over a
            value, which is the role it is defined for. */}
        <div>
          <span className="label-mono block text-muted-foreground">{t.participant_limit}</span>
          <span className="mt-1.5 block font-display text-xl font-semibold tabular-nums">
            {participantLimit > 0 ? participantLimit : t.unlimited}
          </span>
        </div>
      </div>

      <ApplicantPoolManager
        eventId={id}
        applicants={formattedApplicants}
        participantLimit={participantLimit}
      />
    </>
  )
}
