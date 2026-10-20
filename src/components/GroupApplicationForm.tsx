'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Plus } from 'lucide-react'
import { FormFieldList, initialFormData } from './PayloadForm'
import { Button } from '@/components/ui/button'
import { submitEventApplication } from '@/app/[locale]/(frontend)/events/[id]/actions'
import { useTranslation } from '@/i18n/client'
import { cn } from '@/libs/utils'

export type ApplySession = { id: number; name: string; when: string; note?: string; form: any | null }

/*
  The group's application: the common questions once, a chip per session to
  pick, and each picked session's own extra questions under it (board: PFill).
  When adding sessions to an application already on file, `common` is null.
*/
export default function GroupApplicationForm({ eventId, common, sessions, user, preselect = [] }: { eventId: number; common: any | null; sessions: ApplySession[]; user: any; preselect?: number[] }) {
  const { t, locale } = useTranslation()
  const router = useRouter()
  const [picked, setPicked] = useState<number[]>(preselect)
  const [commonData, setCommonData] = useState<Record<string, unknown>>(() => (common ? initialFormData(common, user) : {}))
  const [extra, setExtra] = useState<Record<number, Record<string, unknown>>>(() => Object.fromEntries(sessions.map(s => [s.id, s.form ? initialFormData(s.form, user) : {}])))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const toggle = (id: number) => setPicked(old => old.includes(id) ? old.filter(x => x !== id) : [...old, id])
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!picked.length) { setError(t('events.choose_days')); return }
    setBusy(true); setError('')
    try {
      await submitEventApplication(eventId, commonData, picked, Object.fromEntries(picked.map(id => [String(id), extra[id] ?? {}])))
      router.push(`/${locale}/events/${eventId}?applied=1`)
      router.refresh()
    } catch (err) { setError(err instanceof Error ? err.message : 'Submission failed'); setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {common && (
        <section className="space-y-5 rounded-md border border-border p-5">
          <div className="flex items-baseline gap-3"><h2 className="type-h2 flex-1">{common.title}</h2><span className="text-meta text-muted-foreground">{t('events.apply.asked_once')}</span></div>
          <FormFieldList form={common} user={user} data={commonData} onChange={setCommonData} />
        </section>
      )}
      <div>
        <h2 className="type-h2 mb-3">{t('events.apply.pick_sessions')}</h2>
        <div role="group" aria-label={t('events.apply.pick_sessions')} className="flex flex-wrap gap-2">
          {sessions.map(s => {
            const on = picked.includes(s.id)
            return (
              <button key={s.id} type="button" aria-pressed={on} onClick={() => toggle(s.id)} className={cn('inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-body', on ? 'border-accent bg-accent text-background font-medium' : 'border-dashed border-border text-secondary-foreground hover:border-accent')}>
                {on ? <Check className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}{s.name}
              </button>
            )
          })}
        </div>
      </div>
      {sessions.filter(s => picked.includes(s.id)).map(s => (
        <section key={s.id} className="space-y-4 rounded-md border border-accent p-5">
          <div className="flex items-baseline gap-3"><h3 className="type-h2 flex-1">{s.name}</h3><button type="button" className="text-meta text-muted-foreground hover:text-foreground" onClick={() => toggle(s.id)}>{t('events.apply.remove')}</button></div>
          <p className="text-meta text-muted-foreground">{s.when}{s.note ? ` · ${s.note}` : ''}</p>
          {s.form ? <FormFieldList form={s.form} user={user} data={extra[s.id] ?? {}} onChange={next => setExtra(old => ({ ...old, [s.id]: next }))} /> : <p className="text-meta text-muted-foreground">{t('events.apply.no_extra')}</p>}
        </section>
      ))}
      {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive">{error}</p>}
      <Button type="submit" className="h-auto w-full py-[15px] text-body md:w-auto md:px-8" pending={busy}>
        {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
        {t(picked.length === 1 ? 'events.apply.complete_one' : 'events.apply.complete').replace('{count}', String(picked.length))}
      </Button>
    </form>
  )
}
