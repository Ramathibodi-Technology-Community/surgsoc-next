import React from 'react'
import Link from 'next/link'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { Lock } from 'lucide-react'
import StatusMark, { type StatusKey } from '@/components/StatusMark'
import SessionButton from './SessionButtons'
import { eventWhen, mapPayloadEvent } from '@/libs/event'
import { formatStamp } from '@/libs/utils'
import type { Event } from '@/payload-types'
import type { getDictionary } from '@/i18n/server'

export type MemberSession = { day: Event; status?: string; open: boolean; opensAt?: string | null; reflection?: { id: number; formId: number; deadline?: string | null } | null }
type T = Awaited<ReturnType<typeof getDictionary>>['events']

const MARK: Record<string, StatusKey> = { confirmed: 'complete', participant: 'complete', accepted: 'pending', applicant: 'pending', subscribed: 'waitlist', rejected: 'cancelled', declined: 'cancelled', withdrawn: 'closed' }
const HELD = ['applicant', 'subscribed', 'accepted', 'confirmed', 'participant', 'rejected']

/* The member's view of a group: every session, its own state, and the one or two things they can do about it (board: Member). */
export default function MemberSessions({ eventId, sessions, t, locale }: { eventId: number; sessions: MemberSession[]; t: T; locale: string }) {
  const localeStr = locale === 'th' ? 'th-TH' : 'en-GB'
  return (
    <div className="flex flex-col gap-2.5">
      {sessions.map(({ day, status, open, opensAt, reflection }) => {
        const when = eventWhen(mapPayloadEvent(day), localeStr)
        const held = !!status && HELD.includes(status)
        const label = status ? (t.applicants.status as Record<string, string>)[status] : t.session.not_applied
        const detail = day.participant_detail as React.ComponentProps<typeof RichText>['data'] | null | undefined
        return (
          <article key={day.id} className="flex flex-col gap-3 rounded-md border border-border bg-card px-[18px] py-4">
            <div className="flex items-center gap-3.5">
              <div className="min-w-0 flex-1">
                <Link href={`/events/${day.id}`} className="font-medium hover:text-accent">{day.name}</Link>
                <div className="text-meta text-muted-foreground">{[when.date, when.time].filter(Boolean).join(' · ')}</div>
              </div>
              {status ? <StatusMark status={MARK[status] ?? 'closed'} label={label} /> : <span className="text-meta text-muted-foreground">{label}</span>}
            </div>
            {status === 'accepted' && <p className="text-body text-secondary-foreground">{t.session.accepted_note}</p>}
            {status === 'confirmed' && detail && (
              <div className="rounded-lg border border-border bg-background p-3.5 text-body">
                <div className="mb-1 flex items-center gap-1.5 text-meta text-accent"><Lock className="size-3.5" aria-hidden />{t.joining_details}</div>
                <div className="prose prose-sm dark:prose-invert max-w-none"><RichText data={detail} /></div>
              </div>
            )}
            {reflection && (
              <p className="flex flex-wrap items-center gap-x-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5 text-meta">
                <b className="font-medium">{t.session.reflection_due}{reflection.deadline ? ` ${formatStamp(reflection.deadline, locale)}` : ''}</b>
                <Link className="ml-auto font-medium text-accent" href={`/forms/${reflection.formId}`}>{t.session.fill_in}</Link>
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {status === 'accepted' && <SessionButton dayId={day.id} kind="confirm" label={t.session.confirm_seat} outline={false} />}
              {(status === 'accepted' || status === 'confirmed') && <SessionButton dayId={day.id} kind="leave" label={t.session.leave} title={t.session.leave_title.replace('{name}', day.name)} keep={t.session.keep} />}
              {status === 'subscribed' && <SessionButton dayId={day.id} kind="withdraw" label={t.session.leave_waitlist} title={t.session.leave_waitlist} keep={t.session.keep} />}
              {status === 'applicant' && <SessionButton dayId={day.id} kind="withdraw" label={t.withdraw} title={t.session.withdraw_title.replace('{name}', day.name)} keep={t.session.keep} />}
              {!held && open && <Link className="inline-flex h-[34px] items-center rounded-md border border-border px-3 text-meta font-medium hover:border-accent" href={`/events/${eventId}/apply?session=${day.id}`}>{t.session.add}</Link>}
              {!held && !open && <span className="text-meta text-muted-foreground">{opensAt && Date.parse(opensAt) > Date.now() ? t.session.opens.replace('{date}', formatStamp(opensAt, locale)) : t.session.closed}</span>}
            </div>
          </article>
        )
      })}
    </div>
  )
}
