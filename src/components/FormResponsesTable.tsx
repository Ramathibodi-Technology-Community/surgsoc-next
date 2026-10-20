'use client'

import { useState } from 'react'
import { Eye } from 'lucide-react'
import { useTranslation } from '@/i18n/client'
import AnswersDrawer from '@/components/AnswersDrawer'
import { Button } from '@/components/ui/button'
import { answerOf, type AnswerField, type AnswerRow } from '@/libs/forms/answers'

export type ResponseRow = { id: number; email: string; sent: string; answers: AnswerRow[] | null }

/* Answers only (board 3f): the form doesn't know about events, so acceptance stays in the event's Applicants tab. The eye opens the whole response. */
export default function FormResponsesTable({ rows, fields }: { rows: ResponseRow[]; fields: AnswerField[] }) {
  const { t, locale } = useTranslation()
  const [viewing, setViewing] = useState<number | null>(null)
  const row = rows.find(item => item.id === viewing)
  return (
    <>
      <div className="panel overflow-x-auto" tabIndex={0} role="region" aria-label={t('forms.editor.responses_title')}>
        <table className="data-table">
          <thead><tr>
            <th className="md:sticky md:z-[1] md:bg-[var(--surface)] md:left-[0px] md:w-[224px] md:min-w-[224px]">{t('forms.editor.respondent')}</th><th className="md:sticky md:z-[1] md:bg-[var(--surface)] md:left-[224px] md:w-[150px] md:min-w-[150px]">{t('forms.editor.submitted')}</th>
            {fields.map(field => <th key={field.name} className="whitespace-nowrap">{field.label}</th>)}
            <th className="sticky right-0 p-0"><span className="sr-only">{t('events.actions_label')}</span></th>
          </tr></thead>
          <tbody>
            {rows.map(item => (
              <tr key={item.id}>
                <td className="md:sticky md:z-[1] md:bg-[var(--surface)] md:left-[0px] md:w-[224px] md:min-w-[224px]">{item.email}</td>
                <td className="whitespace-nowrap md:sticky md:z-[1] md:bg-[var(--surface)] md:left-[224px] md:w-[150px] md:min-w-[150px]">{item.sent}</td>
                {fields.map(field => <td key={field.name} lang={locale} className="max-w-[16rem] truncate text-muted-foreground" title={answerOf(item.answers, field.name)}>{answerOf(item.answers, field.name)}</td>)}
                <td className="sticky right-0 border-t border-border p-0"><div className="flex items-center justify-end bg-gradient-to-l from-[var(--surface)] from-65% to-transparent py-2 pr-3 pl-10 backdrop-blur-[3px]"><Button variant="ghost" size="icon" aria-label={t('events.applicants.view_answers')} onClick={() => setViewing(item.id)}><Eye /></Button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AnswersDrawer open={!!row} onOpenChange={open => { if (!open) setViewing(null) }} title={row?.email ?? ''} description={row?.sent} fields={fields} rows={row?.answers} />
    </>
  )
}
