import React from 'react'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/libs/auth/current-user'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import PayloadForm from '@/components/PayloadForm'
import StatusMark from '@/components/StatusMark'
import { submitForm } from './actions'
import { Locale } from '@/i18n/config'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { formClosedReason } from '@/libs/forms/availability'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ formId: string }>
}): Promise<Metadata> {
  const { formId } = await params
  const payload = await getPayload({ config })
  const form = await payload.findByID({ collection: 'forms', id: formId }).catch(() => null)
  return {
    title: form ? `${form.title} | RASS` : 'Form | RASS',
    robots: { index: false },
  }
}

export default async function FormPage({ params }: { params: Promise<{ formId: string, locale: string }> }) {
  const { formId } = await params as { formId: string, locale: Locale }
  const payload = await getPayload({ config })

  const form = await payload.findByID({
    collection: 'forms',
    id: formId,
  })

  if (!form) {
    notFound()
  }

  // Fetch user for prefilling
  const user = await getCurrentUser(payload)

  // Check multiple submission policy
  let alreadySubmitted = false
  if (user && (form as any).publish?.allow_multiple_submissions !== true) {
    const existing = await payload.find({
      collection: 'form-submissions',
      where: {
        and: [
          { form: { equals: formId } },
          { user: { equals: user?.id } },
        ],
      },
      limit: 1,
    })
    alreadySubmitted = existing.totalDocs > 0
  }

  // Closed: the switch is off, the closing date has passed, or the response limit is reached (design board 6).
  const responses = (form as any).response_limit ? await payload.count({ collection: 'form-submissions', where: { form: { equals: formId } } }) : null
  const closedReason = formClosedReason(form as any, responses?.totalDocs ?? 0)
  const closedMessage = (form as any).publish?.closed_message

  return (
    <div className="max-w-[680px]">
      {/* 13px, matching the back link on the event detail page. It was 12px
          caption type here, which made the one navigational element on the page
          the smallest text on it. */}
      <Link
        href="/forms"
        className="text-meta text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Back to forms
      </Link>

      <h1 className="type-h1 mb-std mt-6 max-w-[24ch]">{form.title}</h1>

      <div className="panel p-5 sm:p-[30px]">
        {closedReason && !alreadySubmitted ? (
          <>
            <StatusMark status="closed" label="Closed" className="mb-3" />
            {closedMessage?.root?.children?.length
              ? <RichText className="max-w-[52ch] leading-relaxed text-secondary-foreground" data={closedMessage} />
              : <p className="max-w-[52ch] leading-relaxed text-secondary-foreground">This form is no longer accepting responses. Ask the coordinator if you think this is a mistake.</p>}
          </>
        ) : alreadySubmitted ? (
          /*
            Red said this was a problem. It is not: the form is done and on
            record, which in this system is a blue check — the same marker the
            reader has already met on their account tasks. Red here spends the
            colour that means "attention" on the one outcome that needs none.
          */
          <>
            <StatusMark status="complete" label="Already submitted" className="mb-3" />
            <p className="max-w-[52ch] leading-relaxed text-secondary-foreground">
              Your response is recorded. This form accepts one response per person, so there is
              nothing further to do here.
            </p>
          </>
        ) : (
          <PayloadForm form={form as any} onSubmit={submitForm.bind(null, form.id)} user={user} />
        )}
      </div>
    </div>
  )
}
