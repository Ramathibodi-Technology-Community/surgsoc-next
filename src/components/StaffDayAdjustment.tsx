'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addApplicationDay } from '@/app/[locale]/(frontend)/events/manage/actions'
import { useTranslation } from '@/i18n/client'
import { Button } from './ui/button'

export function StaffDayAdjustment({ parentId, days, applications }: { parentId: number; days: { id: number; name: string }[]; applications: { id: number; label: string; dayIds: number[]; outcomes: { day: string; status: string }[] }[] }) {
  const [submission, setSubmission] = useState('')
  const [search, setSearch] = useState('')
  const available = days.filter(day => !applications.find(app => String(app.id) === submission)?.dayIds.includes(day.id))
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const router = useRouter()
  const { t } = useTranslation()
  return <section className="space-y-4"><form className="panel mb-6 space-y-3 p-4" onSubmit={async e => {
    e.preventDefault(); setPending(true); setError('')
    const data = new FormData(e.currentTarget)
    try { await addApplicationDay(parentId, Number(data.get('submission')), Number(data.get('day'))); router.refresh() }
    catch (failure) { setError(failure instanceof Error ? failure.message : t('events.applicants.batch_failed')) }
    finally { setPending(false) }
  }}><h2 className="type-h2">{t('events.add_day')}</h2><label className="form-label">{t('events.staff.application')}<input type="search" aria-label={t('events.staff.search')} value={search} onChange={e => { setSearch(e.target.value); setSubmission('') }} className="field" /><select name="submission" required value={submission} onChange={e => setSubmission(e.target.value)} className="field"><option value="">—</option>{applications.filter(app => app.label.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(app => <option key={app.id} value={app.id}>{app.label}</option>)}</select></label><label className="form-label">{t('events.days')}<select name="day" required className="field">{available.map(day => <option key={day.id} value={day.id}>{day.name}</option>)}</select></label><Button disabled={pending || !submission || !available.length}>{t('events.add_day')}</Button>{error && <p role="alert" className="text-destructive">{error}</p>}</form><div className="panel overflow-x-auto" tabIndex={0} role="region" aria-label={t('events.staff.outcomes')}><table className="data-table"><thead><tr><th>{t('events.staff.application')}</th><th>{t('events.staff.outcomes')}</th></tr></thead><tbody>{applications.filter(app => app.label.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(app => <tr key={app.id}><td>{app.label}</td><td>{app.outcomes.map(outcome => <p key={outcome.day}>{outcome.day}: {t(`events.applicants.status.${outcome.status}`)}</p>)}</td></tr>)}</tbody></table></div></section>
}
