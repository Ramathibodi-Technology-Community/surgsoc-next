import React from 'react'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'
import Link from 'next/link'
import { getDictionary } from '@/i18n/server'
import { Locale } from '@/i18n/config'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/PageHeader'
import Record from '@/components/Record'

export const metadata: Metadata = {
  title: 'Forms | RASS',
  description: 'View your assigned forms and submission history.',
}

export default async function FormsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params as { locale: Locale }
  const t = (await getDictionary(locale)).forms
  const payload = await getPayload({ config })
  const headersList = await headers()
  const { user } = await payload.auth({ headers: headersList })

  if (!user) {
    return (
      <div className="panel mx-auto max-w-[420px] p-9 text-center">
        <h1 className="type-h2 mb-2">{t.sign_in_required}</h1>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{t.please_sign_in}</p>
        <Button asChild className="w-full">
          <Link href="/api/auth/google">{t.sign_in_google}</Link>
        </Button>
      </div>
    )
  }

  const [assignmentsResult, submissionsResult] = await Promise.all([
    payload.find({
      collection: 'form-assignments',
      where: { user: { equals: user.id } },
      depth: 2,
      sort: '-createdAt',
    }),
    payload.find({
      collection: 'form-submissions',
      where: { user: { equals: user.id } },
      depth: 2,
      sort: '-createdAt',
    }),
  ])

  const pending = assignmentsResult.docs.filter((a: any) => !a.completed)
  const submissions = submissionsResult.docs

  const formatDate = (date: string) => new Date(date).toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-GB')

  // Both collections point at a `form` relationship that may or may not be
  // populated depending on depth — normalise once rather than at each use.
  const formOf = (record: any) => {
    const form = record.form
    return typeof form === 'object' && form !== null
      ? { id: form.id, title: form.title as string }
      : { id: form, title: `Form #${form}` }
  }

  return (
    <>
      <PageHeader
        title="Everything waiting on you"
        lead="Membership and session forms are assigned by the committee."
      />

      {/*
        Forms have no image and never will, so the record's right slot carries
        the status instead. That single substitution is what lets a form and an
        event share one component.
      */}
      <section className="mb-10">
        <div className="rail">
          <h2 className="type-h2">{t.assigned_forms}</h2>
          <span className="rail-bar" />
          {pending.length > 0 && <span className="pill-count">{pending.length}</span>}
        </div>
        {pending.length === 0 ? (
          <div className="empty-note">
            <p className="font-medium text-secondary-foreground">{t.no_pending}</p>
          </div>
        ) : (
          <div className="card-grid">
            {pending.map((assignment: any) => {
              const form = formOf(assignment)
              const due = assignment.due_date ? new Date(assignment.due_date) : null
              const overdue = due ? due.getTime() < Date.now() : false
              return (
                <Record
                  key={assignment.id}
                  href={`/forms/${form.id}`}
                  title={form.title}
                  tag={t.assigned_forms}
                  meta={
                    due
                      ? /* Tense carries the state: `closes` versus `closed`. */
                        `${overdue ? 'closed' : 'closes'} ${due.toLocaleDateString(
                          locale === 'th' ? 'th-TH' : 'en-GB',
                          { day: 'numeric', month: 'short' },
                        )}`
                      : 'no closing date'
                  }
                  status={overdue ? 'overdue' : due ? 'pending' : 'no-deadline'}
                />
              )
            })}
          </div>
        )}
      </section>

      <section>
        <div className="rail">
          <h2 className="type-h2">{t.completed_submissions}</h2>
          <span className="rail-bar" />
          <span className="meta-mono">{submissions.length}</span>
        </div>
        {submissions.length === 0 ? (
          <div className="empty-note">
            <p className="font-medium text-secondary-foreground">{t.no_submissions}</p>
          </div>
        ) : (
          <div className="card-grid">
            {submissions.map((sub: any) => {
              const form = formOf(sub)
              return (
                <Record
                  key={sub.id}
                  href={`/forms/${form.id}`}
                  title={form.title}
                  tag={t.completed}
                  meta={formatDate(sub.createdAt)}
                  status="complete"
                />
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}
