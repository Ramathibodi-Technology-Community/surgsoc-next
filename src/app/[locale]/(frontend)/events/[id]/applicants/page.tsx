import React from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ApplicantPoolManager from '@/components/ApplicantPoolManager'

export default async function ApplicantsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const payload = await getPayload({ config })
  const headersList = await headers()
  const { user } = await payload.auth({ headers: headersList })

  if (!user) {
    redirect('/login')
  }

  // Fetch event
  const event = await payload.findByID({
    collection: 'events',
    id,
  })

  // Check if user is event owner or admin.
  // Unwrap the owner relationship — Payload may return it as an ID or a populated object.
  const ownerId = typeof event.owner === 'object' && event.owner !== null
    ? (event.owner as { id: string | number }).id
    : event.owner
  const isAuthorized =
    String(ownerId) === String(user.id) ||
    ['admin', 'superadmin', 'vp'].some(r => (user as any).roles?.includes(r))

  if (!isAuthorized) {
    redirect(`/events/${id}`)
  }

  const participantLimit =
    typeof (event as { participant_limit?: unknown }).participant_limit === 'number'
      ? ((event as { participant_limit?: number }).participant_limit ?? 0)
      : 0

  // Fetch applicants
  // payload.find returns paginated docs
  const { docs: applicants } = await payload.find({
    collection: 'registrations',
    where: {
      event: { equals: id },
      status: { in: ['applicant', 'accepted', 'rejected', 'subscribed'] },
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
        ← Back to the event
      </Link>

      <div className="mb-9 mt-6 flex flex-wrap items-end justify-between gap-6">
        <h1 className="type-h1 max-w-[26ch]">Registrations · {event.name}</h1>
        {/* label-mono stays here: this one genuinely is a field caption over a
            value, which is the role it is defined for. */}
        <div>
          <span className="label-mono block text-muted-foreground">Participant limit</span>
          <span className="mt-1.5 block font-display text-xl font-semibold tabular-nums">
            {participantLimit > 0 ? participantLimit : 'Unlimited'}
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
