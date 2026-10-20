'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye } from 'lucide-react'
import { useTranslation } from '@/i18n/client'
import { requestApplicantAction } from '@/libs/applicant-actions'
import { BATCHABLE_STATUSES } from '@/libs/applicant-status'
import StatusMark, { type StatusKey } from '@/components/StatusMark'
import AnswersDrawer from '@/components/AnswersDrawer'
import { Button } from '@/components/ui/button'
import { answerOf, formatAnswer, type AnswerField, type AnswerRow } from '@/libs/forms/answers'
import { cn } from '@/libs/utils'

export type GroupApplicant = {
  key: string
  name: string
  email: string
  createdAt: string
  answers: AnswerRow[] | null
  sessions: { regId: string; dayId: number; status: string; extra: AnswerRow[] | null }[]
}
export type GroupDay = { id: number; name: string; left: number | null }
type Decision = 'accept' | 'wait' | 'reject'

const MARK: Record<string, StatusKey> = { applicant: 'applied', subscribed: 'applied', accepted: 'applied', confirmed: 'accepted', participant: 'accepted', rejected: 'rejected', declined: 'rejected', withdrawn: 'withdrawn' }
const current = (status: string): Decision | null => status === 'accepted' || status === 'confirmed' ? 'accept' : status === 'subscribed' ? 'wait' : status === 'rejected' ? 'reject' : null
const FROZEN = 'md:sticky md:z-[1] md:bg-[var(--surface)]'

/* Applicants of an event group (board: ApplicantsH): one row per person, a status per session, and a drawer that decides each session separately. */
export default function GroupApplicantsTable({ applicants, days, fields, dayFields }: { applicants: GroupApplicant[]; days: GroupDay[]; fields: AnswerField[]; dayFields: Record<number, AnswerField[]> }) {
  const { t, locale } = useTranslation()
  const router = useRouter()
  const [viewing, setViewing] = useState<string | null>(null)
  const [choice, setChoice] = useState<Record<string, Decision>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const at = applicants.findIndex(row => row.key === viewing)
  const row = at >= 0 ? applicants[at] : undefined
  const dayOf = (id: number) => days.find(day => day.id === id)
  const open = (key: string | null) => { setViewing(key); setChoice({}); setError('') }
  const pendingCount = applicants.filter(item => item.sessions.some(s => s.status === 'applicant')).length

  const save = async (andNext: boolean) => {
    if (!row) return
    setBusy(true); setError('')
    try {
      const batches = new Map<string, string[]>()
      for (const s of row.sessions) {
        const next = choice[s.regId]
        if (next && next !== current(s.status)) batches.set(`${s.dayId}:${next}`, [...(batches.get(`${s.dayId}:${next}`) ?? []), s.regId])
      }
      for (const [key, ids] of batches) { const [day, action] = key.split(':'); await requestApplicantAction(day, action as Decision, ids) }
      router.refresh()
      const next = andNext ? applicants[at + 1] : undefined
      open(next?.key ?? null)
    } catch (failure) { setError(failure instanceof Error ? failure.message : t('events.applicants.batch_failed')) }
    setBusy(false)
  }

  return (
    <>
      <div className="panel overflow-x-auto" tabIndex={0} role="region" aria-label={t('events.applicants.registrations_for')}>
        <table className="data-table">
          <thead>
            <tr className="text-xs">
              <th colSpan={2} className="pb-0 text-left">{t('events.applicants.group_applicant')}</th>
              <th colSpan={days.length} className="border-l border-border pb-0 text-left">{t('events.days')}</th>
              {fields.length > 0 && <th colSpan={fields.length} className="border-l border-border pb-0 text-left">{t('events.applicants.group_answers')}</th>}
              <th className="sticky right-0 w-14 p-0" />
            </tr>
            <tr>
              <th className={cn(FROZEN, 'md:left-0 md:w-[176px] md:min-w-[176px]')}>{t('events.applicants.table.name')}</th>
              <th className={cn(FROZEN, 'md:left-[176px] md:w-[112px] md:min-w-[112px]')}>{t('events.applicants.table.applied_at')}</th>
              {days.map((day, i) => <th key={day.id} className={cn('whitespace-nowrap', i === 0 && 'border-l border-border')}>{day.name}</th>)}
              {fields.map((field, i) => <th key={field.name} className={cn('whitespace-nowrap', i === 0 && 'border-l border-border')}>{field.label}</th>)}
              <th className="sticky right-0 p-0"><span className="sr-only">{t('events.actions_label')}</span></th>
            </tr>
          </thead>
          <tbody>
            {applicants.map(item => (
              <tr key={item.key}>
                <td className={cn(FROZEN, 'md:left-0 md:w-[176px] md:min-w-[176px]')}><b className="font-medium">{item.name}</b><span className="block text-muted-foreground">{item.email}</span></td>
                <td className={cn(FROZEN, 'tabular-nums md:left-[176px] md:w-[112px] md:min-w-[112px]')}>{new Date(item.createdAt).toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-GB')}</td>
                {days.map((day, i) => {
                  const s = item.sessions.find(x => x.dayId === day.id)
                  return <td key={day.id} className={cn('whitespace-nowrap', i === 0 && 'border-l border-border')}>{s ? <StatusMark status={MARK[s.status] || 'withdrawn'} label={t(`events.applicants.status.${s.status}`)} /> : <span className="text-muted-foreground">—</span>}</td>
                })}
                {fields.map((field, i) => <td key={field.name} lang={locale} className={cn('max-w-[16rem] truncate text-muted-foreground', i === 0 && 'border-l border-border')} title={answerOf(item.answers, field.name)}>{answerOf(item.answers, field.name)}</td>)}
                <td className="sticky right-0 border-t border-border p-0">
                  <div className="flex items-center justify-end bg-gradient-to-l from-[var(--surface)] from-65% to-transparent py-2 pr-3 pl-10 backdrop-blur-[3px]">
                    <Button variant="ghost" size="icon" aria-label={t('events.applicants.view_answers')} onClick={() => open(item.key)}><Eye /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {!applicants.length && <tr><td colSpan={3 + days.length + fields.length} className="p-4">{t('events.applicants.empty')}</td></tr>}
          </tbody>
        </table>
      </div>
      <AnswersDrawer
        open={!!row}
        onOpenChange={o => { if (!o) open(null) }}
        title={row?.name ?? ''}
        description={row ? `${row.email} · ${t('events.applicants.pending_count').replace('{n}', String(Math.max(pendingCount, 0)))}` : undefined}
        fields={fields}
        rows={row?.answers}
        position={row ? `${at + 1} / ${applicants.length}` : undefined}
        onPrev={at > 0 ? () => open(applicants[at - 1].key) : undefined}
        onNext={at >= 0 && at < applicants.length - 1 ? () => open(applicants[at + 1].key) : undefined}
        actions={row ? <>
          {error && <p role="alert" className="mr-auto text-meta text-destructive">{error}</p>}
          <Button variant="outline" disabled={busy} onClick={() => save(false)}>{t('events.applicants.save')}</Button>
          <Button pending={busy} onClick={() => save(true)}>{t('events.applicants.save_next')}</Button>
        </> : undefined}
      >
        {row && [...row.sessions].sort((a, b) => days.findIndex(d => d.id === a.dayId) - days.findIndex(d => d.id === b.dayId)).map(s => {
          const day = dayOf(s.dayId)
          const editable = BATCHABLE_STATUSES.includes(s.status)
          const picked = choice[s.regId] ?? current(s.status)
          const extraFields = dayFields[s.dayId] ?? []
          return (
            <section key={s.regId} className="space-y-3">
              <div className="flex items-baseline gap-3"><h3 className="flex-1 font-medium">{day?.name}</h3><span className="text-meta text-muted-foreground">{day?.left == null ? t('events.unlimited') : day.left > 0 ? t('events.applicants.seats_left').replace('{n}', String(day.left)) : t('events.applicants.full')}</span></div>
              {extraFields.map(field => <div key={field.name}><p className="text-xs text-muted-foreground">{field.label}</p><p className="mt-1 whitespace-pre-wrap text-body">{formatAnswer(s.extra?.find(r => r.field === field.name)?.value)}</p></div>)}
              {editable ? (
                <div role="radiogroup" aria-label={day?.name} className="flex gap-2">
                  {(['accept', 'wait', 'reject'] as Decision[]).map(d => (
                    <Button key={d} type="button" role="radio" aria-checked={picked === d} variant={picked === d ? 'default' : 'outline'} className={cn('flex-1', picked !== d && d === 'reject' && 'text-destructive')} onClick={() => setChoice(old => ({ ...old, [s.regId]: d }))}>{t(`events.applicants.decision.${d}`)}</Button>
                  ))}
                </div>
              ) : <StatusMark status={MARK[s.status] || 'withdrawn'} label={t(`events.applicants.status.${s.status}`)} />}
            </section>
          )
        })}
      </AnswersDrawer>
    </>
  )
}
