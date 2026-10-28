'use client'

import { DateTimePicker } from '@/components/ui/date-time-picker'
import Link from 'next/link'
import { eventReturnPath } from '@/libs/utils'
import { useEffect, useState, Fragment } from 'react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useRouter } from 'next/navigation'
import { AlignLeft, ArrowDown, ArrowUp, Calendar, CheckSquare, ChevronsUpDown, CircleDot, Hash, ListChecks, ListOrdered, Mail, MessageSquareText, Pencil, Plus, SlidersHorizontal, Trash2, Type, UserRound, type LucideIcon } from 'lucide-react'
import { useTranslation } from '@/i18n/client'
import { FORM_BLOCKS, PROFILE_FIELDS, profileValue } from '@/libs/forms/validation'
import { deleteForm, duplicateForm, saveForm } from '@/app/[locale]/(frontend)/forms/manage/actions'
import FormMessageEditor, { emptyMessage } from './FormMessageEditor'
import { Button } from './ui/button'
import FormShell from './FormShell'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu'

// One icon per field type, same stroke family as the rest of the site, so a row says what it asks before it is read.
const TYPE_ICON: Record<string, LucideIcon> = {
  text: Type, textarea: AlignLeft, email: Mail, number: Hash, select: ChevronsUpDown, checkbox: CheckSquare, date: Calendar,
  radio: CircleDot, checkboxGroup: ListChecks, slider: SlidersHorizontal, ranking: ListOrdered, userProfile: UserRound, message: MessageSquareText,
}

// "Overall rating" -> "overall_rating". Thai-only labels slug to nothing, so the caller keeps the current name then.
const slug = (label: string) => label.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
const autoNamed = (field: any) => !field.name || /^field_\d+$/.test(field.name) || field.name === slug(field.label || '')

export type FormTab = 'questions' | 'after' | 'availability' | 'settings'

/*
  The staff view of one form: header (title, preview, accepting), section tabs,
  and one question list whose rows open an edit drawer. One draft, one Save —
  tabs are just different parts of the same draft, so switching never loses edits.
*/
function TypeIcon({ type, className }: { type: string; className?: string }) {
  const Icon = TYPE_ICON[type] ?? Type
  return <Icon aria-hidden className={className} />
}

export default function FormEditor({ form, user, returnTo, tab, responseCount, canAssign, usedBy = [], ownerEmail }: { form?: any; user: any; returnTo?: string; tab: FormTab; responseCount: number; canAssign: boolean; usedBy?: { id: number; name: string }[]; ownerEmail?: string }) {
  const [draft, setDraft] = useState<any>(form || { title: '', fields: [], submitButtonLabel: 'Submit', accept_responses: true, confirmationMessage: emptyMessage })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [removeIndex, setRemoveIndex] = useState<number | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [copying, setCopying] = useState(false)
  const [deleting, setDeleting] = useState(false)
  // Fields whose name the user chose to set by hand; every other name follows its label.
  const [customName, setCustomName] = useState<(string | number)[]>(() => (form?.fields || []).filter((f: any) => !autoNamed(f)).map((f: any) => f.id))
  const router = useRouter()
  const { t, locale } = useTranslation()
  useEffect(() => { if (!dirty) return; const warn = (e: BeforeUnloadEvent) => e.preventDefault(); window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn) }, [dirty])
  const change = (key: string, value: any) => { setDirty(true); setDraft((old: any) => ({ ...old, [key]: value })) }
  const update = (index: number, changes: any) => change('fields', draft.fields.map((field: any, i: number) => i === index ? { ...field, ...changes } : field))
  const relabel = (index: number, label: string) => {
    const field = draft.fields[index]
    const base = slug(label)
    if (customName.includes(field.id ?? index) || !base) return update(index, { label })
    let name = base, n = 2
    while (draft.fields.some((other: any, i: number) => i !== index && other.name === name)) name = `${base}_${n++}`
    update(index, { label, name })
  }
  const move = (index: number, step: number) => { const fields = [...draft.fields]; [fields[index], fields[index + step]] = [fields[index + step], fields[index]]; change('fields', fields) }
  const input = (label: string, value: any, onChange: (value: string) => void, type = 'text') => <label className="form-label">{label}<input className="field" type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} /></label>

  const back = eventReturnPath(returnTo)
  const save = async () => {
    setPending(true); setError('')
    try { const id = await saveForm(form?.id || null, draft); setDirty(false); if (form?.id) router.refresh(); else router.push(`/${locale}/forms/${id}/edit${back ? `?returnTo=${encodeURIComponent(back)}` : ''}`) }
    catch (failure) { setError(failure instanceof Error ? failure.message : t('forms.error')) }
    finally { setPending(false) }
  }

  const copy = async () => {
    setCopying(true); setError('')
    try { router.push(`/forms/${await duplicateForm(form.id, t('forms.editor.copy_of'))}/edit`) }
    catch (failure) { setError(failure instanceof Error ? failure.message : t('forms.error')); setCopying(false) }
  }

  const field = editing !== null ? draft.fields[editing] : null
  const rowAction = 'grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring'

  return <FormShell
    formId={form?.id ?? null}
    title={draft.title}
    subtitle={`${draft.fields.length} ${t('forms.editor.fields')}${form?.id ? ` · ${responseCount} ${t('forms.editor.responses')}` : ''}`}
    accepting={draft.accept_responses !== false}
    tab={tab}
    back={back}
    responseCount={responseCount}
    canAssign={canAssign}
    actions={<Button type="button" disabled={pending || (!dirty && !!form?.id)} aria-busy={pending} onClick={save}>{t('forms.editor.save')}</Button>}
  >
    {(dirty || error) && <p role={error ? 'alert' : 'status'} className={error ? 'mb-4 text-destructive' : 'mb-4 text-meta text-muted-foreground'}>{error || t('forms.editor.unsaved')}</p>}

    {tab === 'questions' && (
      <section className="max-w-2xl">
        {!draft.fields.length && <div className="empty-note mb-4"><p className="font-medium text-secondary-foreground">{t('forms.editor.no_questions')}</p></div>}
        <ol className="flex flex-col gap-2.5">
          {draft.fields.map((item: any, index: number) => (
            <li key={item.id || index} className="group flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3">
              <span className="w-5 text-meta tabular-nums text-muted-foreground">{index + 1}</span>
              <TypeIcon type={item.blockType} className="size-[18px] shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{item.blockType === 'message' ? t('forms.editor.type_message') : item.label || item.name}{item.required && <span className="text-destructive"> *</span>}</span>
                <span className="block text-meta text-muted-foreground">{t(`forms.editor.types.${item.blockType}`)}{item.conditional?.enabled ? ` · ${t('forms.editor.conditional').toLocaleLowerCase(locale)}` : ''}</span>
              </span>
              {/* Revealed on hover or focus; always shown where there is no hover. */}
              <span className="flex items-center gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                <button type="button" className={rowAction} aria-label={t('forms.editor.edit_field')} onClick={() => setEditing(index)}><Pencil className="size-4" /></button>
                {index > 0 && <button type="button" className={rowAction} aria-label={t('forms.editor.up')} onClick={() => move(index, -1)}><ArrowUp className="size-4" /></button>}
                {index < draft.fields.length - 1 && <button type="button" className={rowAction} aria-label={t('forms.editor.down')} onClick={() => move(index, 1)}><ArrowDown className="size-4" /></button>}
                <button type="button" className={`${rowAction} hover:text-destructive`} aria-label={t('forms.editor.remove')} onClick={() => setRemoveIndex(index)}><Trash2 className="size-4" /></button>
              </span>
            </li>
          ))}
        </ol>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button type="button" variant="outline" className="mt-4"><Plus />{t('forms.editor.add_question')}</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {FORM_BLOCKS.map(type => (
              <DropdownMenuItem key={type} onSelect={() => { change('fields', [...draft.fields, { id: crypto.randomUUID(), blockType: type, name: `field_${draft.fields.length + 1}`, label: '', ...(type === 'userProfile' ? { profileField: 'email' } : {}) }]); setEditing(draft.fields.length) }}><TypeIcon type={type} className="size-4 text-muted-foreground" />{t(`forms.editor.types.${type}`)}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </section>
    )}

    {tab === 'after' && (
      <section className="max-w-2xl space-y-5">
        <h2 className="type-h2">{t('forms.editor.confirmation')}</h2>
        <p className="text-meta text-muted-foreground">{t('forms.editor.confirmation_note')}</p>
        <div role="radiogroup" aria-label={t('forms.editor.confirmation')} className="grid grid-cols-2 gap-2">
          {(['message', 'redirect'] as const).map(kind => (
            <label key={kind} className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-card px-4 py-3 has-[:checked]:border-accent">
              <input type="radio" name="confirmationType" className="accent-[var(--accent)]" checked={(draft.confirmationType || 'message') === kind} onChange={() => change('confirmationType', kind)} />
              {t(`forms.editor.after_${kind}`)}
            </label>
          ))}
        </div>
        {draft.confirmationType === 'redirect'
          ? input(t('forms.editor.after_link'), draft.redirect?.url, value => change('redirect', { url: value }))
          : <FormMessageEditor value={draft.confirmationMessage} onChange={value => change('confirmationMessage', value)} />}
      </section>
    )}

    {tab === 'availability' && (
      <section className="max-w-xl space-y-6">
        <div>
          <h2 className="type-h2">{t('forms.editor.accepting_label')}</h2>
          <p className="mt-1 text-meta text-muted-foreground">{form?.id ? t('forms.editor.accepting_in_header') : ''}</p>
        </div>
        {!form?.id && <label className="form-check"><input type="checkbox" checked={draft.accept_responses !== false} onChange={e => change('accept_responses', e.target.checked)} />{t('forms.editor.accept_responses')}</label>}
        <div className="form-label">{t('forms.editor.deadline')} <span className="text-muted-foreground">· {t('forms.editor.optional')}</span><DateTimePicker label={t('forms.editor.deadline')} value={draft.response_deadline} onChange={iso => change('response_deadline', iso)} /></div>
        {input(`${t('forms.editor.limit')} · ${t('forms.editor.optional')}`, draft.response_limit || 0, value => change('response_limit', Number(value)), 'number')}
        <label className="form-check"><input type="checkbox" checked={!!draft.publish?.allow_multiple_submissions} onChange={e => change('publish', { ...draft.publish, allow_multiple_submissions: e.target.checked })} />{t('forms.editor.multiple')}</label>
        <div className="space-y-2">
          <h3 className="panel-title">{t('forms.editor.when_closed')}</h3>
          <p className="text-meta text-muted-foreground">{t('forms.editor.when_closed_note')}</p>
          <FormMessageEditor value={draft.publish?.closed_message} onChange={value => change('publish', { ...draft.publish, closed_message: value })} />
        </div>
        {usedBy.length > 0 && <p className="text-meta text-muted-foreground">{t('forms.editor.event_window_note')}</p>}
      </section>
    )}

    {tab === 'settings' && (
      <section className="max-w-xl space-y-8">
        <div className="space-y-5">
          <h2 className="type-h2">{t('forms.editor.settings')}</h2>
          {input(`${t('forms.editor.title')} *`, draft.title, value => change('title', value))}
          {form?.id && <dl className="space-y-3 text-body">
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t('forms.editor.owner')}</dt><dd>{ownerEmail || t('forms.editor.unassigned')}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">{t('forms.editor.used_by')}</dt><dd className="text-right">{usedBy.length ? usedBy.map(use => <Link key={use.id} className="block text-accent" href={`/events/${use.id}/edit`}>{use.name}</Link>) : t('forms.editor.not_used')}</dd></div>
          </dl>}
        </div>
        {form?.id && (
          <div className="space-y-4">
            <h2 className="type-h2">{t('forms.editor.copy_or_remove')}</h2>
            <div className="flex items-center justify-between gap-4"><div><p className="font-medium">{t('forms.editor.duplicate')}</p><p className="text-meta text-muted-foreground">{t('forms.editor.duplicate_note')}</p></div><Button type="button" variant="outline" disabled={copying} onClick={copy}>{t('forms.editor.duplicate')}</Button></div>
            <div className="flex items-center justify-between gap-4"><div><p className="font-medium">{t('forms.editor.delete_form')}</p><p className="text-meta text-muted-foreground">{t('forms.editor.delete_note')}</p></div><Button type="button" variant="outline" className="border-destructive/60 text-destructive hover:bg-destructive/10" disabled={usedBy.length > 0 || responseCount > 0} onClick={() => setDeleting(true)}>{t('forms.editor.delete')}</Button></div>
          </div>
        )}
      </section>
    )}

    <Sheet open={editing !== null} onOpenChange={open => { if (!open) setEditing(null) }}>
      <SheetContent side="edit" className="gap-0 md:max-w-[420px]">
        {field && editing !== null && (
          <>
            <SheetHeader className="px-6 pt-6 pb-2"><SheetTitle className="panel-title text-xl">{t('forms.editor.edit_field')} · {editing + 1}</SheetTitle></SheetHeader>
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
              <p className="flex items-center gap-2 text-meta text-muted-foreground"><TypeIcon type={field.blockType} className="size-4" />{t(`forms.editor.types.${field.blockType}`)}</p>
              {field.blockType !== 'message' && <>{input(t('forms.editor.label'), field.label, value => relabel(editing, value))}{customName.includes(field.id ?? editing) ? input(t('forms.editor.name'), field.name, value => update(editing, { name: value })) : <p className="text-meta text-muted-foreground">{t('forms.editor.name')}: <code>{field.name}</code> · {t('forms.editor.name_auto')}</p>}<label className="form-check"><input type="checkbox" checked={customName.includes(field.id ?? editing)} onChange={e => setCustomName(old => e.target.checked ? [...old, field.id ?? editing] : old.filter(key => key !== (field.id ?? editing)))} />{t('forms.editor.name_custom')}</label><label className="form-check"><input type="checkbox" checked={!!field.required} onChange={e => update(editing, { required: e.target.checked })} />{t('forms.required')}</label>{input(t('forms.editor.default'), field.defaultValue, value => update(editing, { defaultValue: value }))}</>}
              {field.blockType === 'message' && <FormMessageEditor value={field.message} onChange={value => update(editing, { message: value })} />}
              {['select', 'radio', 'checkboxGroup', 'ranking'].includes(field.blockType) && <div><p>{t('forms.editor.options')}</p>{(field.options || []).map((option: any, optionIndex: number) => <div className="my-2 flex gap-2" key={option.id || optionIndex}><input aria-label={t('forms.editor.label')} className="field" value={option.label} onChange={e => update(editing, { options: field.options.map((old: any, i: number) => i === optionIndex ? { ...old, label: e.target.value, ...(!old.value || old.value === slug(old.label || '') ? { value: slug(e.target.value) || old.value } : {}) } : old) })} /><input aria-label={t('forms.editor.value')} className="field" value={option.value} onChange={e => update(editing, { options: field.options.map((old: any, i: number) => i === optionIndex ? { ...old, value: e.target.value } : old) })} /><Button type="button" variant="outline" aria-label={t('forms.editor.remove')} onClick={() => update(editing, { options: field.options.filter((_: any, i: number) => i !== optionIndex) })}>×</Button></div>)}<Button type="button" variant="outline" onClick={() => update(editing, { options: [...(field.options || []), { label: '', value: '' }] })}>{t('forms.editor.add_option')}</Button></div>}
              {['slider', 'number', 'checkboxGroup'].includes(field.blockType) && <div className="grid grid-cols-2 gap-3">{(field.blockType === 'checkboxGroup' ? ['minSelect', 'maxSelect'] : ['min', 'max', ...(field.blockType === 'slider' ? ['step'] : [])]).map(key => <Fragment key={key}>{input(t(`forms.editor.${key}`), field[key], value => update(editing, { [key]: value === '' ? null : Number(value) }), 'number')}</Fragment>)}</div>}
              {field.blockType === 'slider' && <><label className="form-label">{t('forms.editor.variant')}<select className="field" value={field.variant || 'rating'} onChange={e => update(editing, { variant: e.target.value })}>{['rating', 'stars', 'slider'].map(value => <option key={value}>{value}</option>)}</select></label>{input(t('forms.editor.minLabel'), field.minLabel, value => update(editing, { minLabel: value }))}{input(t('forms.editor.maxLabel'), field.maxLabel, value => update(editing, { maxLabel: value }))}<label className="form-check"><input type="checkbox" checked={!!field.showLabels} onChange={e => update(editing, { showLabels: e.target.checked })} />{t('forms.editor.showLabels')}</label></>}
              {field.blockType === 'radio' && <label className="form-label">{t('forms.editor.layout')}<select className="field" value={field.layout || 'vertical'} onChange={e => update(editing, { layout: e.target.value })}><option>vertical</option><option>horizontal</option></select></label>}
              {field.blockType === 'userProfile' && <><label className="form-label">{t('forms.editor.profile_source')}<select className="field" value={field.profileField || 'email'} onChange={e => update(editing, { profileField: e.target.value })}>{PROFILE_FIELDS.map(path => <option key={path}>{path}</option>)}</select></label><label className="form-check"><input type="checkbox" checked={!!field.readOnly} onChange={e => update(editing, { readOnly: e.target.checked })} />{t('forms.editor.read_only')}</label><p className="text-sm text-muted-foreground">{t('forms.editor.profile_debug')}: {profileValue(user, field.profileField || 'email') || t('forms.editor.missing_profile')} · {field.readOnly ? t('forms.editor.server_value') : t('forms.editor.editable')}</p></>}
              {field.blockType !== 'message' && <details className="space-y-3"><summary className="cursor-pointer text-body font-medium">{t('forms.editor.conditional')}</summary><label className="form-check"><input type="checkbox" checked={!!field.conditional?.enabled} onChange={e => update(editing, { conditional: { ...field.conditional, enabled: e.target.checked } })} />{t('forms.editor.enabled')}</label><select className="field" aria-label={t('forms.editor.source')} value={field.conditional?.source_field || ''} onChange={e => update(editing, { conditional: { ...field.conditional, source_field: e.target.value } })}><option value="">—</option>{draft.fields.filter((other: any) => other.name && other.name !== field.name).map((other: any) => <option key={other.name}>{other.name}</option>)}</select><select className="field" aria-label={t('forms.editor.operator')} value={field.conditional?.operator || 'equals'} onChange={e => update(editing, { conditional: { ...field.conditional, operator: e.target.value } })}>{['equals', 'not_equals', 'contains', 'greater_than', 'less_than'].map(value => <option key={value}>{value}</option>)}</select>{input(t('forms.editor.value'), field.conditional?.value, value => update(editing, { conditional: { ...field.conditional, value } }))}<select className="field" aria-label={t('forms.editor.action')} value={field.conditional?.action || 'show'} onChange={e => update(editing, { conditional: { ...field.conditional, action: e.target.value } })}><option>show</option><option>hide</option></select></details>}
            </div>
            <div className="flex justify-end px-6 pt-2 pb-6"><Button type="button" onClick={() => setEditing(null)}>{t('forms.editor.done')}</Button></div>
          </>
        )}
      </SheetContent>
    </Sheet>

    <ConfirmDialog
      open={removeIndex !== null}
      onOpenChange={open => { if (!open) setRemoveIndex(null) }}
      title={t('forms.editor.remove_title')}
      description={t('forms.editor.remove_body')}
      action={t('forms.editor.remove')}
      keep={t('forms.editor.keep_field')}
      destructive
      onConfirm={() => { change('fields', draft.fields.filter((_: any, i: number) => i !== removeIndex)); setRemoveIndex(null) }}
    />
    <ConfirmDialog
      open={deleting}
      onOpenChange={setDeleting}
      title={t('forms.editor.delete_q')}
      description={t('forms.editor.delete_body')}
      action={t('forms.editor.delete')}
      keep={t('forms.editor.keep_form')}
      destructive
      onConfirm={async () => { try { await deleteForm(form.id); setDirty(false); router.push('/forms/manage') } catch (failure) { setError(failure instanceof Error ? failure.message : t('forms.error')); setDeleting(false) } }}
    />
  </FormShell>
}
