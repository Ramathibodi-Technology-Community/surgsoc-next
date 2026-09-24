import React from 'react'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/libs/auth/current-user'
import Link from 'next/link'
import PageHeader from '@/components/PageHeader'
import ProfileEditor from '@/components/ProfileEditor'
import Record from '@/components/Record'
import { StatusDot } from '@/components/StatusMark'
import { mapPayloadEvent } from '@/libs/event'
import { getDictionary } from '@/i18n/server'
import { Locale } from '@/i18n/config'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getMissingProfileFields } from '@/libs/profile-completion'
import { findTags } from '@/libs/tags'

export const metadata: Metadata = {
  title: 'My Account | RASS',
  description: 'Manage your Ramathibodi Surgical Society profile and registrations.',
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params as { locale: Locale }
  const t = (await getDictionary(locale)).account
  const payload = await getPayload({ config })
  const user = await getCurrentUser(payload)

  if (!user) {
    return (
      <div className="panel mx-auto max-w-[420px] p-9 text-center">
        <h1 className="type-h2 mb-2">{t.not_logged_in}</h1>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{t.please_sign_in}</p>
        <Button asChild className="w-full">
          <Link href="/login">{t.go_to_login}</Link>
        </Button>
      </div>
    )
  }

  /*
    Six reads, one round trip. Two are tasks still owed — forms not yet
    completed, and places held that have not been answered. The third is
    history: `participant` is the status the coordinator sets once someone has
    actually turned up, which is what makes it the honest source for "attended"
    rather than `confirmed`, which only records an intention. The fourth is the
    interest vocabulary the editor can change, which ProfileEditor needs as a
    prop because it is a client component.
  */
  const [
    assignmentsResult,
    registrationsResult,
    attendedResult,
    interestOptions,
    trackOptions,
    yearOptions,
  ] = await Promise.all([
    payload.find({
      collection: 'form-assignments',
      where: { and: [{ user: { equals: user.id } }, { completed: { equals: false } }] },
      depth: 2,
      sort: '-createdAt',
    }),
    payload.find({
      collection: 'registrations',
      where: { and: [{ user: { equals: user.id } }, { status: { equals: 'accepted' } }] },
      depth: 2,
      sort: '-createdAt',
    }),
    payload.find({
      collection: 'registrations',
      where: { and: [{ user: { equals: user.id } }, { status: { equals: 'participant' } }] },
      depth: 2,
      sort: '-createdAt',
      limit: 50,
    }),
    findTags(payload, 'event_type'),
    findTags(payload, 'track'),
    findTags(payload, 'year'),
  ])

  const assignments = assignmentsResult.docs
  const registrations = registrationsResult.docs
  const taskCount = assignments.length + registrations.length

  // Registrations whose event failed to populate would render a record that
  // links to /events/undefined — drop them rather than ship a dead row.
  const attended = attendedResult.docs
    .map((reg) => (typeof reg.event === 'object' && reg.event !== null ? reg.event : null))
    .filter(Boolean)
    .map((event) => mapPayloadEvent(event as never))

  const missingProfileFields = getMissingProfileFields(user as any)
  const profileComplete = missingProfileFields.length === 0

  const fullName =
    [user.name_english?.first_name, user.name_english?.last_name].filter(Boolean).join(' ') || 'User'

  const dateOf = (event: { date_begin?: string | null; date: string }) =>
    new Date(event.date_begin || event.date).toLocaleDateString(
      locale === 'th' ? 'th-TH' : 'en-GB',
      { day: 'numeric', month: 'short', year: 'numeric' },
    )

  return (
    <>
      <PageHeader title={t.title} />

      {/*
        Who you are, as a single unlabelled block — the page title already names
        it, so a rail above it would label the label. Everything below is a rail,
        matching `/events` and `/forms`: this is one application, and a page that
        invents its own section idiom reads as a different site.
      */}
      <section className="panel mb-10 p-4 sm:p-[26px]">
        <div className="flex flex-wrap items-center gap-[18px]">
          <Avatar className="h-[54px] w-[54px]">
            <AvatarImage src={user.image_url || ''} alt="" />
            <AvatarFallback className="bg-primary text-xl font-medium text-primary-foreground">
              {(user.name_english?.first_name || user.email || '?').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* min-w-0 lets a long address wrap inside the row rather than
              pushing the roles and the link off the card. */}
          <div className="min-w-0 flex-1 basis-[180px]">
            <p className="font-display text-xl font-semibold leading-[1.3]">{fullName}</p>
            <p className="meta-mono [overflow-wrap:anywhere]">{user.email}</p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {user.roles?.map((role) => (
              <span
                key={role}
                className="label-mono rounded-full border border-border-strong px-3 py-[7px] capitalize text-muted-foreground"
              >
                {role}
              </span>
            ))}
          </div>

          {/* Not destructive — you can sign back in. Red here would spend the
              one colour that means "this cannot be undone". */}
          <Link
            href="/admin/logout"
            className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Log out
          </Link>
        </div>

        {!profileComplete && (
          /* Separated by space, inside the same block — it is a status about
             the person named directly above it, not a page-level notice, and
             lifting it out would make it read as one. */
          <div className="mt-[22px] flex flex-wrap items-start gap-3.5">
            <StatusDot status="pending" className="mt-1" />
            <div className="min-w-0 flex-1 basis-[200px]">
              <p className="text-[15px] font-medium leading-snug text-warning">
                Complete your profile to unlock event registration
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                Missing: {missingProfileFields.join(', ')}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── What we hold about you ───────────────────────────────── */}
      <section className="mb-10">
        <div className="rail">
          <h2 className="type-h2">Profile</h2>
          <span className="rail-bar" />
        </div>
        <ProfileEditor
          user={user}
          interestOptions={interestOptions}
          trackOptions={trackOptions}
          yearOptions={yearOptions}
        />
      </section>

      {/* ── What is still owed ───────────────────────────────────── */}
      <section className="mb-10">
        <div className="rail">
          <h2 className="type-h2">{t.tasks_title}</h2>
          <span className="rail-bar" />
          {taskCount > 0 && <span className="pill-count">{taskCount}</span>}
        </div>

        {taskCount === 0 ? (
          /* Tier "explained": the whole section is empty, so it says what is
             absent and what changes it. Never a slogan, never an illustration. */
          <div className="empty-note">
            <p className="font-medium text-secondary-foreground">{t.no_tasks}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{t.tasks_hint}</p>
          </div>
        ) : (
          <>
            {/* Two sources, one shape — the same record the forms page uses. */}
            <div className="card-grid">
              {assignments.map((assignment: any) => {
                const form = assignment.form
                const formTitle = typeof form === 'object' ? form.title : `Form #${form}`
                const formId = typeof form === 'object' ? form.id : form
                return (
                  <Record
                    key={`form-${assignment.id}`}
                    href={`/forms/${formId}`}
                    title={formTitle}
                    tag={t.tasks_assigned_forms}
                    meta={t.tasks_complete_form}
                    status="pending"
                  />
                )
              })}

              {registrations.map((reg) => {
                const event = reg.event as any
                return (
                  <Record
                    key={`reg-${reg.id}`}
                    href={`/events/${event?.id}`}
                    title={event?.name || t.unknown_event}
                    tag={t.tasks_event_confirmations}
                    meta={t.tasks_confirm_attendance}
                    status="pending"
                    statusLabel={t.tasks_event_confirmations}
                  />
                )
              })}
            </div>

            <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">{t.tasks_hint}</p>
          </>
        )}
      </section>

      {/* ── What you have already done ───────────────────────────── */}
      <section>
        <div className="rail">
          <h2 className="type-h2">{t.attended_title}</h2>
          <span className="rail-bar" />
          <span className="meta-mono">{attended.length}</span>
        </div>

        {attended.length === 0 ? (
          <div className="empty-note">
            <p className="font-medium text-secondary-foreground">{t.no_attended}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              {t.attended_hint}
            </p>
          </div>
        ) : (
          /* History, so it takes the record the past-events list uses — a poster
             in the right slot, not a status. There is nothing to act on here;
             the only affordance is going back to the session. */
          <div className="card-grid">
            {attended.map((event) => (
              <Record
                key={`attended-${event.id}`}
                href={`/events/${event.id}`}
                title={event.name}
                tag={event.eventType || null}
                meta={<time dateTime={event.date_begin || event.date}>{dateOf(event)}</time>}
                imageUrl={event.posterUri || null}
              />
            ))}
          </div>
        )}
      </section>
    </>
  )
}
