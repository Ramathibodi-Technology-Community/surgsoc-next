import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'
import { submitFeedbackRequest } from './actions'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Feedback | RASS',
  description: 'Report a bug or request a feature.',
  robots: { index: false },
}

export default async function FeedbackPage() {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!user) {
    redirect('/login')
  }

  const senderName =
    [user.name_english?.first_name, user.name_english?.last_name].filter(Boolean).join(' ') || user.email

  return (
    <>
      <PageHeader
        title="Tell us what is not working"
        lead="Reports go to the admin team and are read within a week. Only admins can view submissions."
      />

      {/*
        Every field carries a help slot, and every help slot is rendered whether
        or not it has something to say. That is the point: when the browser's
        validation message arrives it *replaces* the hint instead of inserting a
        line, so nothing below it moves while someone is part-way through
        typing. A slot that appears only on error is a slot that jumps the form.
      */}
      <form action={submitFeedbackRequest} className="panel max-w-[680px] p-5 sm:p-[30px]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-5">
          <label htmlFor="type">
            <span className="field-label">What is this about?</span>
            <select id="type" name="type" defaultValue="feature" className="field cursor-pointer">
              <option value="feature">Feature request</option>
              <option value="bug">Bug report</option>
            </select>
            <span className="field-help">Bug reports get read first.</span>
          </label>

          <label htmlFor="title">
            <span className="field-label">Title</span>
            <input id="title" name="title" type="text" required maxLength={120} className="field" />
            <span className="field-help">One line. 120 characters at most.</span>
          </label>

          <label htmlFor="description" className="col-span-full">
            <span className="field-label">Your message</span>
            <textarea
              id="description"
              name="description"
              required
              rows={6}
              className="field min-h-[110px] placeholder:text-muted-foreground"
            />
            {/* This was placeholder text. A placeholder disappears the moment
                someone starts typing — exactly when the instruction becomes
                useful — and it is not read as a label. */}
            <span className="field-help">
              Be specific. If it is about a session, say which station.
            </span>
          </label>
        </div>

        {/* Space, not a rule: the footer of a form inside a panel does not need
            a second boundary drawn under the one the panel already draws. */}
        <div className="mt-7 flex flex-wrap items-center gap-[18px]">
          <Button type="submit">Send feedback</Button>
          <span className="text-[13px] leading-relaxed text-muted-foreground">
            Sent as {senderName}
          </span>
        </div>
      </form>
    </>
  )
}
