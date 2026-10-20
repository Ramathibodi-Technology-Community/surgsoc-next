'use client'

import { useState } from 'react'
import { Eye } from 'lucide-react'
import { useTranslation } from '@/i18n/client'
import StatusMark, { type StatusKey } from '@/components/StatusMark'
import AnswersDrawer from '@/components/AnswersDrawer'
import { Button } from '@/components/ui/button'
import { answerOf, type AnswerField, type AnswerRow } from '@/libs/forms/answers'

export type ReflectionRow = { id: number; name: string; email?: string; state: 'overdue' | 'pending' | 'dormant' | 'complete'; answers: AnswerRow[] | null }

const MARK: Record<ReflectionRow['state'], StatusKey> = { overdue: 'overdue', pending: 'pending', dormant: 'no-deadline', complete: 'complete' }

/* Who owes a reflection, what they said, one row each. The same table language as Applicants. */
export default function ReflectionTable({ rows, fields }: { rows: ReflectionRow[]; fields: AnswerField[] }) {
  const { t, locale } = useTranslation()
  const [viewing, setViewing] = useState<number | null>(null)
  const row = rows.find(item => item.id === viewing)
  return (
    <>
      <div className="panel overflow-x-auto" tabIndex={0} role="region" aria-label={t('events.reflection')}>
        <table className="data-table">
          <thead><tr>
            <th className="md:sticky md:z-[1] md:bg-[var(--surface)] md:left-[0px] md:w-[176px] md:min-w-[176px]">{t('events.applicants.table.name')}</th>
            <th className="md:sticky md:z-[1] md:bg-[var(--surface)] md:left-[176px] md:w-[150px] md:min-w-[150px]">{t('events.applicants.table.status')}</th>
            {fields.map(field => <th key={field.name} className="whitespace-nowrap">{field.label}</th>)}
            <th className="sticky right-0 p-0"><span className="sr-only">{t('events.actions_label')}</span></th>
          </tr></thead>
          <tbody>
            {rows.map(item => (
              <tr key={item.id}>
                <td className="md:sticky md:z-[1] md:bg-[var(--surface)] md:left-[0px] md:w-[176px] md:min-w-[176px]"><b className="font-medium">{item.name}</b>{item.email && <span className="block text-muted-foreground">{item.email}</span>}</td>
                <td className="md:sticky md:z-[1] md:bg-[var(--surface)] md:left-[176px] md:w-[150px] md:min-w-[150px]"><StatusMark status={MARK[item.state]} label={t(`events.staff.${item.state}`)} /></td>
                {fields.map(field => <td key={field.name} lang={locale} className="max-w-[16rem] truncate text-muted-foreground" title={answerOf(item.answers, field.name)}>{answerOf(item.answers, field.name)}</td>)}
                <td className="sticky right-0 border-t border-border p-0"><div className="flex items-center justify-end bg-gradient-to-l from-[var(--surface)] from-65% to-transparent py-2 pr-3 pl-10 backdrop-blur-[3px]">{item.answers ? <Button variant="ghost" size="icon" aria-label={t('events.applicants.view_answers')} onClick={() => setViewing(item.id)}><Eye /></Button> : <span className="size-9" aria-hidden />}</div></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={3 + fields.length} className="p-4">{t('events.staff.none_yet')}</td></tr>}
          </tbody>
        </table>
      </div>
      <AnswersDrawer open={!!row} onOpenChange={open => { if (!open) setViewing(null) }} title={row?.name ?? ''} description={row?.email} fields={fields} rows={row?.answers} />
    </>
  )
}
