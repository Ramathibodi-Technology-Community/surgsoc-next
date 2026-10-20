'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/i18n/client'
import { BATCHABLE_STATUSES, SEATED_STATUSES } from '@/libs/applicant-status'
import { requestApplicantAction } from '@/libs/applicant-actions'
import StatusMark, { type StatusKey } from '@/components/StatusMark'
import { Button } from '@/components/ui/button'
import { Eye, MoreHorizontal } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import AnswersDrawer from '@/components/AnswersDrawer'
import { answerOf, type AnswerField } from '@/libs/forms/answers'

const STATUS_MARK: Record<string, StatusKey> = {
  applicant: 'applied', subscribed: 'applied', accepted: 'applied', confirmed: 'accepted', participant: 'accepted',
  rejected: 'rejected', declined: 'rejected', withdrawn: 'withdrawn',
}

export interface Applicant {
  id: string
  user: any
  status: string
  createdAt: string
  submission?: any
  integrityWarning?: string
}

export default function ApplicantPoolManager({ eventId, applicants, participantLimit, onRefresh, fields = [] }: { eventId: string; applicants: Applicant[]; participantLimit: number; onRefresh?: () => void; fields?: AnswerField[] }) {
  const [selected, setSelected] = useState<string[]>([])
  const [viewing, setViewing] = useState<string | null>(null)
  const [pending, setPending] = useState<string[]>([])
  const [error, setError] = useState('')
  const [rejectIds, setRejectIds] = useState<string[]>([])
  const [reason, setReason] = useState('')
  const router = useRouter()
  const { t, locale } = useTranslation()
  const label = (status: string) => t(`events.applicants.status.${status}`)
  const filtered = applicants
  const run = async (action: 'accept' | 'reject', ids: string[]) => {
    if (pending.length) return
    setPending(ids); setError('')
    try {
      await requestApplicantAction(eventId, action, ids, reason)
      setSelected([]); setRejectIds([]); setReason('')
      if (onRefresh) onRefresh(); else router.refresh()
    } catch (failure) { setError(failure instanceof Error ? failure.message : t('events.applicants.batch_failed')) }
    finally { setPending([]) }
  }
  /* design.md § Data table: selection, a bulk bar, one row action and a row menu. Search, filters and sorting are deliberately deferred. */
  const selectable = filtered.filter(row => BATCHABLE_STATUSES.includes(row.status) && !row.integrityWarning)
  const allOn = selectable.length > 0 && selectable.every(row => selected.includes(row.id))
  const someOn = selected.length > 0 && !allOn
  const busy = !!pending.length
  const name = (row: Applicant) => typeof row.user === 'object' ? [row.user.name_english?.first_name, row.user.name_english?.last_name].filter(Boolean).join(' ') || row.user.email : row.user
  return <div className="space-y-4">
    <p className="text-muted-foreground">{t('events.participant_limit')}: {applicants.filter(row => SEATED_STATUSES.includes(row.status)).length} / {participantLimit || t('events.unlimited')}</p>
    {!!selected.length && (
      <div className="flex flex-wrap items-center gap-3 rounded-md bg-secondary px-3.5 py-2 text-meta">
        <b className="font-medium">{selected.length} {t('events.select').toLocaleLowerCase(locale)}</b>
        <span className="flex-1" />
        <Button pending={busy} onClick={() => run('accept', selected)}>{t('events.accept')}</Button>
        <Button variant="outline" className="border-destructive/60 text-destructive hover:bg-destructive/10" disabled={busy} onClick={() => setRejectIds(selected)}>{t('events.reject')}</Button>
        <Button variant="link" className="text-accent" onClick={() => setSelected([])}>{t('events.applicants.deselect_all')}</Button>
      </div>
    )}
    {!!rejectIds.length && <fieldset className="form-section"><legend className="panel-title">{t('events.reject')}</legend><label className="form-label">{t('events.rejection_reason')}<textarea className="field" value={reason} maxLength={2000} onChange={e => setReason(e.target.value)} /></label><Button pending={busy} onClick={() => run('reject', rejectIds)}>{t('events.reject')}</Button><Button variant="outline" onClick={() => setRejectIds([])}>{t('events.cancel')}</Button></fieldset>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <div className="panel overflow-x-auto" tabIndex={0} role="region" aria-label={t('events.applicants.registrations_for')}>
      <table className="data-table">
        <thead>
          {/* Three sections, read left to right: who, where they stand, what they wrote. */}
          <tr className="text-xs">
            <th colSpan={3} className="pb-0 text-left">{t('events.applicants.group_applicant')}</th>
            <th className="border-l border-border pb-0 text-left">{t('events.applicants.group_status')}</th>
            {fields.length > 0 && <th colSpan={fields.length} className="border-l border-border pb-0 text-left">{t('events.applicants.group_answers')}</th>}
            <th className="sticky right-0 w-24 p-0" />
          </tr>
          <tr>
            <th className="md:sticky md:z-[1] md:bg-[var(--surface)] md:left-[0px] md:w-[36px] md:min-w-[36px]">{selectable.length > 0 && <input type="checkbox" aria-label={t('events.applicants.select_all')} checked={allOn} ref={el => { if (el) el.indeterminate = someOn }} onChange={e => setSelected(e.target.checked ? selectable.map(row => row.id) : [])} />}</th>
            <th className="md:sticky md:z-[1] md:bg-[var(--surface)] md:left-[36px] md:w-[176px] md:min-w-[176px]">{t('events.applicants.table.name')}</th><th className="md:sticky md:z-[1] md:bg-[var(--surface)] md:left-[212px] md:w-[112px] md:min-w-[112px]">{t('events.applicants.table.applied_at')}</th>
            <th className="border-l border-border md:sticky md:z-[1] md:bg-[var(--surface)] md:left-[324px] md:w-[150px] md:min-w-[150px]">{t('events.applicants.table.status')}</th>
            {fields.map((field, i) => <th key={field.name} className={`whitespace-nowrap ${i === 0 ? 'border-l border-border' : ''}`}>{field.label}</th>)}
            <th className="sticky right-0 p-0"><span className="sr-only">{t('events.actions_label')}</span></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(row => {
            const batchable = BATCHABLE_STATUSES.includes(row.status)
            return (
              <tr key={row.id}>
                <td className="md:sticky md:z-[1] md:bg-[var(--surface)] md:left-[0px] md:w-[36px] md:min-w-[36px]">{batchable && !row.integrityWarning && <input aria-label={`${t('events.select')} ${row.id}`} type="checkbox" checked={selected.includes(row.id)} onChange={e => setSelected(old => e.target.checked ? [...old, row.id] : old.filter(id => id !== row.id))} />}</td>
                <td className="md:sticky md:z-[1] md:bg-[var(--surface)] md:left-[36px] md:w-[176px] md:min-w-[176px]"><b className="font-medium">{name(row)}</b><span className="block text-muted-foreground">{typeof row.user === 'object' ? row.user.academic?.student_id : ''}</span>

                </td>
                <td className="tabular-nums md:sticky md:z-[1] md:bg-[var(--surface)] md:left-[212px] md:w-[112px] md:min-w-[112px]">{new Date(row.createdAt).toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-GB')}</td>
                <td className="border-l border-border md:sticky md:z-[1] md:bg-[var(--surface)] md:left-[324px] md:w-[150px] md:min-w-[150px]"><StatusMark status={STATUS_MARK[row.status] || 'withdrawn'} label={label(row.status)} />{row.integrityWarning && <p className="text-destructive">{row.integrityWarning}</p>}</td>
                {fields.map((field, i) => <td key={field.name} lang={locale} className={`max-w-[16rem] truncate text-muted-foreground ${i === 0 ? 'border-l border-border' : ''}`} title={answerOf(row.submission?.submissionData, field.name)}>{answerOf(row.submission?.submissionData, field.name)}</td>)}
                {/* Pinned right, the table blurs into it. Actions (when there are any) then view; view is always last, so it never moves. */}
                <td className="sticky right-0 border-t border-border p-0">
                  <div className="flex items-center justify-end gap-0.5 bg-gradient-to-l from-[var(--surface)] from-65% to-transparent py-2 pr-3 pl-10 backdrop-blur-[3px]">
                    {batchable && !row.integrityWarning ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={busy} aria-busy={pending.includes(row.id)} aria-label={t('events.actions_label')}><MoreHorizontal /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => run('accept', [row.id])}>{t('events.accept')}</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setRejectIds([row.id])}>{t('events.reject')}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : <span className="size-9" aria-hidden />}
                    {row.submission ? <Button variant="ghost" size="icon" aria-label={t('events.applicants.view_answers')} onClick={() => setViewing(row.id)}><Eye /></Button> : <span className="size-9" aria-hidden />}
                  </div>
                </td>
              </tr>
            )
          })}
          {!filtered.length && <tr><td colSpan={5 + fields.length} className="p-4">{t('events.applicants.empty')}</td></tr>}
        </tbody>
      </table>
    </div>
    {(() => {
      const withAnswers = applicants.filter(item => item.submission)
      const at = withAnswers.findIndex(item => item.id === viewing)
      const row = at >= 0 ? withAnswers[at] : undefined
      const canDecide = !!row && BATCHABLE_STATUSES.includes(row.status) && !row.integrityWarning
      // Decide, then land on the next person waiting: the drawer is a review queue, not a viewer.
      const nextWaiting = row ? withAnswers.slice(at + 1).find(item => BATCHABLE_STATUSES.includes(item.status) && !item.integrityWarning) : undefined
      return <AnswersDrawer
        open={!!row}
        onOpenChange={open => { if (!open) setViewing(null) }}
        title={row ? name(row) : ''}
        description={row && typeof row.user === 'object' ? row.user.email : undefined}
        fields={fields}
        rows={row?.submission?.submissionData}
        position={row ? `${at + 1} / ${withAnswers.length}` : undefined}
        onPrev={at > 0 ? () => setViewing(withAnswers[at - 1].id) : undefined}
        onNext={at >= 0 && at < withAnswers.length - 1 ? () => setViewing(withAnswers[at + 1].id) : undefined}
        actions={canDecide && row ? <>
          <Button variant="outline" className="border-destructive/60 text-destructive hover:bg-destructive/10" disabled={busy} onClick={() => { setViewing(null); setRejectIds([row.id]) }}>{t('events.reject')}</Button>
          <Button disabled={busy} aria-busy={pending.includes(row.id)} onClick={async () => { await run('accept', [row.id]); setViewing(nextWaiting?.id ?? null) }}>{nextWaiting ? t('events.applicants.accept_next') : t('events.accept')}</Button>
        </> : undefined}
      />
    })()}
  </div>
}
