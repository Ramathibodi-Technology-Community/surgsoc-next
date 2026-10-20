'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslation } from '@/i18n/client'
import { saveEvent } from '@/app/[locale]/(frontend)/events/manage/actions'
import { releaseReflectionNow } from '@/actions/release-reflection'
import FormMessageEditor from './FormMessageEditor'
import { RichText } from '@payloadcms/richtext-lexical/react'
import EventCard from './EventCard'
import PayloadForm from './PayloadForm'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { mapPayloadEvent } from '@/libs/event'
import { Button } from './ui/button'

const id = (value: any) => typeof value === 'object' && value ? value.id : value ?? ''
const localDate = (value: any) => value ? new Date(Date.parse(value) + 7 * 3600000).toISOString().slice(0, 16) : ''

export default function EventEditor({ event, forms, tags, parents, assignmentAccess, relationshipAccess, formAccess, people, groups }: { event: any; forms: any[]; tags: Record<string, any[]>; parents: any[]; assignmentAccess: boolean; relationshipAccess: boolean; formAccess: boolean; people: { id: number; name: string }[]; groups: { id: number; name: string }[] }) {
  const [draft, setDraft] = useState<any>({ ...event, event_structure: event?.event_structure || 'standalone', registration_selection_mode: event?.registration_selection_mode || 'manual', status_override: event?.status_override || 'auto', is_visible: event?.is_visible !== false })
  const [dirty, setDirty] = useState(false)
  useEffect(() => { if (!dirty) return; const warn = (e: BeforeUnloadEvent) => e.preventDefault(); window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn) }, [dirty])
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const router = useRouter()
  const { t, locale } = useTranslation()
  const change = (name: string, value: unknown) => { setDirty(true); setDraft((old: any) => ({ ...old, [name]: value })) }
  const text = (name: string, type = 'text', required = false) => type === 'datetime-local'
    ? <div key={name} className="form-label">{t(`events.editor.${name}`)}{required && ' *'}<DateTimePicker value={draft[name]} required={required} onChange={iso => change(name, iso)} /></div>
    : <label key={name} className="form-label">{t(`events.editor.${name}`)}{required && ' *'}<input className="field" type={type} required={required} min={type === 'number' ? 0 : undefined} step={type === 'datetime-local' ? 60 : undefined} value={type === 'datetime-local' ? localDate(draft[name]) : draft[name] ?? ''} onChange={e => change(name, type === 'datetime-local' ? (e.target.value ? new Date(`${e.target.value}+07:00`).toISOString() : null) : type === 'number' ? Number(e.target.value) : e.target.value)} /></label>
  const select = (name: string, choices: any[], required = false) => <label key={name} className="form-label">{t(`events.editor.${name}`)}<select className="field" required={required} value={id(draft[name])} onChange={e => change(name, e.target.value ? Number(e.target.value) : null)}><option value="">—</option>{choices.map(item => <option key={item.id} value={item.id}>{item.name || item.title || (locale === 'th' ? item.label_th || item.label : item.label)}</option>)}</select></label>
  return <div className="grid gap-8 lg:grid-cols-2 lg:items-start"><form className="min-w-0 space-y-6" onSubmit={async e => {
    e.preventDefault(); setPending(true); setError('')
    const data = { ...draft }
    if (data.event_structure !== 'day') data.parent_event = null
    else { data.subscription_form = null; data.registration_opens_at = null; data.registration_closes_at = null }
    try { const saved = await saveEvent(event?.id || null, data); setDirty(false); router.push(`/${locale}/events/${saved}/edit`); router.refresh() }
    catch (failure) { setError(failure instanceof Error ? failure.message : t('events.save_failed')) }
    finally { setPending(false) }
  }}>
    <fieldset className="form-section"><legend className="panel-title">{t('events.basics')}</legend>{text('name', 'text', true)}<label className="form-label">{t('events.editor.event_structure')}<select className="field" value={draft.event_structure} onChange={e => change('event_structure', e.target.value)}>{['standalone', 'multi_day', 'day'].map(value => <option key={value} value={value}>{t(`events.structure.${value}`)}</option>)}</select></label>{draft.event_structure === 'day' && select('parent_event', parents, true)}{select('event_type', tags.event_type, true)}{select('department', tags.department)}{text('date_begin', 'datetime-local', true)}{text('date_end', 'datetime-local', draft.event_structure === 'multi_day')}{select('location', tags.location)}{text('image_url')}<label className="form-label">{t('events.editor.description')}<textarea className="field" value={draft.description || ''} onChange={e => change('description', e.target.value)} /></label><label className="form-check"><input type="checkbox" checked={draft.is_visible} onChange={e => change('is_visible', e.target.checked)} />{t('events.editor.is_visible')}</label></fieldset>
    {draft.event_structure !== 'day' && <fieldset className="form-section"><legend className="panel-title">{t('events.application')}</legend>{select('subscription_form', forms)}{text('registration_opens_at', 'datetime-local')}{text('registration_closes_at', 'datetime-local')}<label className="form-label">{t('events.editor.status_override')}<select className="field" value={draft.status_override} onChange={e => change('status_override', e.target.value)}>{['auto', 'open', 'closed'].map(value => <option key={value} value={value}>{t(`events.override.${value}`)}</option>)}</select></label><label className="form-check"><input type="checkbox" checked={!!draft.is_registration_closed} onChange={e => change('is_registration_closed', e.target.checked)} />{t('events.editor.is_registration_closed')}</label></fieldset>}
    {draft.event_structure !== 'multi_day' && <fieldset className="form-section"><legend className="panel-title">{t('events.participants')}</legend>{text('participant_limit', 'number')}{text('max_waiting_list', 'number')}<label className="form-label">{t('events.editor.registration_selection_mode')}<select className="field" value={draft.registration_selection_mode} onChange={e => change('registration_selection_mode', e.target.value)}>{['manual', 'accepted', 'confirmed'].map(value => <option key={value} value={value}>{t(`events.selection.${value}`)}</option>)}</select></label>{select('loa_form', forms)}{text('custom_acceptance_email')}</fieldset>}
    {assignmentAccess && <fieldset className="form-section"><legend className="panel-title">{t('events.reflection')}</legend>{select('reflection_form', forms)}{text('reflection_release_at', 'datetime-local')}{text('reflection_deadline', 'datetime-local')}{event?.id && <Button type="button" variant="outline" disabled={pending} onClick={async () => { setPending(true); try { await releaseReflectionNow(event.id); router.refresh() } catch (failure) { setError(failure instanceof Error ? failure.message : t('events.save_failed')) } finally { setPending(false) } }}>{t('events.release_now')}</Button>}</fieldset>}
    <fieldset className="form-section"><legend className="panel-title">{t('events.staff.joining')}</legend><FormMessageEditor value={draft.participant_detail} onChange={value => change('participant_detail', value)} /></fieldset>
    {relationshipAccess && <fieldset className="form-section"><legend className="panel-title">{t('events.staff.responsible')}</legend>{event?.id && select('owner', people)}{select('coordinator', people)}<label className="form-label">{t('events.staff.groups')}<select multiple className="field" value={(draft.groups || []).map(String)} onChange={e => change('groups', Array.from(e.target.selectedOptions, option => Number(option.value)))}>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label></fieldset>}
    <div className="flex flex-wrap items-center gap-4"><Button pending={pending}>{t('events.save')}</Button>{error && <p role="alert" className="text-destructive">{error}</p>}</div>
  </form><aside className="min-w-0 space-y-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto"><div className="rail"><h2 className="type-h2">{t('events.preview')}</h2><span className="rail-bar" /></div><EventCard className="h-auto" event={mapPayloadEvent({ ...draft, location: tags.location.find(location => location.id === Number(id(draft.location))) })} />{forms.find(form => form.id === Number(id(draft.subscription_form))) && <PayloadForm key={String(id(draft.subscription_form))} preview form={forms.find(form => form.id === Number(id(draft.subscription_form)))} onSubmit={async () => {}} />}{event?.id && <nav className="panel flex flex-col gap-3 p-5 text-body"><Link className="text-accent" href={`/events/${event.id}`}>{t('events.actions.see_details')}</Link><Link className="text-accent" href={`/events/${event.id}/applicants`}>{t('events.applicants.registrations_for')}</Link><Link className="text-accent" href={`/admin/collections/events/${event.id}`}>{t('events.staff.advanced')}</Link>{formAccess && <><Link className="text-accent" href={`/${locale}/forms/new?returnTo=${encodeURIComponent(`/${locale}/events/${event.id}/edit`)}`}>{t('events.staff.new_form')}</Link>{['subscription_form', 'reflection_form', 'loa_form'].map(key => draft[key] && <Link key={key} className="text-accent" href={`/${locale}/forms/${id(draft[key])}/edit?returnTo=${encodeURIComponent(`/${locale}/events/${event.id}/edit`)}`}>{t(`events.editor.${key}`)} · {t('events.staff.edit_form')}</Link>)}</>}</nav>}{draft.participant_detail && <section className="panel space-y-3 p-5"><h3 className="panel-title">{t('events.staff.joining_preview')}</h3><RichText data={draft.participant_detail} /></section>}</aside></div>
}
