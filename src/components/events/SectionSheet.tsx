'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/i18n/client'
import { saveEvent } from '@/app/[locale]/(frontend)/events/manage/actions'
import { type SectionField } from '@/libs/event-sections'
import FormMessageEditor from '@/components/FormMessageEditor'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Combobox } from '@/components/ui/combobox'
import { Pencil } from 'lucide-react'
import PosterImage from '@/components/PosterImage'
import { cn } from '@/libs/utils'

export type Option = { value: string; label: string; hint?: string }
const NONE = '__none'

/*
  One staff editor for one section. It sends only its own keys, so saving
  Registration can never blank Basics. Errors stay inside the sheet, beside
  the button that failed.
*/
export default function SectionSheet({ eventId, title, description, fields, values, options, create, inline, triggerClassName }: {
  // Extra classes for the Edit button, e.g. a solid fill where it sits on top of an image.
  triggerClassName?: string
  // Editing an existing event on the page instead of in a sheet (the stepped setup); saving moves on to `next`.
  inline?: { next: string; label: string }
  eventId: number | null
  // Creating: the same fields, laid out on the page instead of in a sheet; saving lands on the event's edit page.
  create?: { structure: string; parentId?: number | null; label: string; next?: string }
  title: string
  description?: string
  fields: SectionField[]
  values: Record<string, unknown>
  options: Record<string, Option[]>
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(values)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const set = (name: string, value: unknown) => setDraft(old => ({ ...old, [name]: value }))

  const toggle = (next: boolean) => {
    if (next) { setDraft(values); setError('') }
    setOpen(next)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setPending(true); setError('')
    try {
      const data = Object.fromEntries(fields.map(field => [field.name, draft[field.name] ?? null]))
      if (create) {
        const saved = await saveEvent(null, { ...data, event_structure: create.structure, parent_event: create.parentId ?? null, is_visible: false })
        router.push(create.next ?? `/events/${saved}/edit`)
        return
      }
      if (inline) {
        await saveEvent(eventId, data)
        router.push(inline.next)
        return
      }
      await saveEvent(eventId, data)
      setOpen(false)
      router.refresh()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('events.save_failed'))
    } finally { setPending(false) }
  }

  const control = (field: SectionField) => {
    const id = `field-${field.name}`
    const value = draft[field.name]
    switch (field.kind) {
      case 'textarea': return <Textarea id={id} rows={field.name === 'description' ? 10 : 4} value={String(value ?? '')} onChange={e => set(field.name, e.target.value)} />
      case 'number': return <Input id={id} type="number" min={0} inputMode="numeric" value={value == null ? '' : String(value)} onChange={e => set(field.name, e.target.value === '' ? null : Number(e.target.value))} />
      case 'datetime': return <DateTimePicker id={id} label={t(field.labelKey ?? `events.editor.${field.name}`)} required={field.required} value={value} onChange={next => set(field.name, next)} />
      case 'richtext': return <FormMessageEditor value={value} onChange={next => set(field.name, next)} />
      case 'select': return (
        <Select value={value == null || value === '' ? (field.required ? undefined : NONE) : String(value)} onValueChange={next => set(field.name, next === NONE ? null : /^\d+$/.test(next) ? Number(next) : next)}>
          <SelectTrigger id={id} className="w-full"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            {!field.required && <SelectItem value={NONE}>—</SelectItem>}
            {(options[field.name] || []).map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )
      case 'multiselect': {
        const chosen = (value as number[] | undefined) || []
        return (
          <div className="flex flex-col divide-y divide-border rounded-md border border-border" role="group" aria-labelledby={`${id}-label`}>
            {(options[field.name] || []).map(option => {
              const n = Number(option.value)
              return (
                <label key={option.value} className="flex cursor-pointer items-center gap-3 px-3.5 py-3 text-body">
                  <Checkbox checked={chosen.includes(n)} onCheckedChange={on => set(field.name, on ? [...chosen, n] : chosen.filter(x => x !== n))} />
                  {option.label}
                </label>
              )
            })}
          </div>
        )
      }
      case 'choice': return (
        <div role="radiogroup" aria-labelledby={`${id}-label`} className="flex flex-col gap-2">
          {(options[field.name] || []).map(option => (
            <label key={option.value} className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-card px-4 py-3 has-[:checked]:border-primary has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50">
              <input type="radio" name={field.name} value={option.value} checked={String(value ?? '') === option.value} onChange={() => set(field.name, option.value)} className="mt-1 accent-[var(--primary)]" />
              <span className="flex flex-col gap-0.5">
                <span className="text-body font-medium">{option.label}</span>
                {option.hint && <span className="text-meta text-muted-foreground">{option.hint}</span>}
              </span>
            </label>
          ))}
        </div>
      )
      case 'search': return <Combobox id={id} value={value == null ? null : String(value)} options={options[field.name] || []} onChange={next => set(field.name, next == null ? null : Number(next))} placeholder={t('events.staff.search_people')} emptyLabel={t('events.staff.no_matches')} noneLabel={t('events.staff.not_assigned')} />
      case 'poster': return (
        <div className="flex flex-col gap-3">
          <Input id={id} type="url" inputMode="url" value={String(value ?? '')} onChange={e => set(field.name, e.target.value)} />
          <p className="text-meta text-muted-foreground">{t('events.staff.poster_hint')}</p>
          {/* The poster in the frame cards use: a typo shows up as the hatch and seal, not as a broken page. */}
          <div className="placeholder-hatch poster-slot aspect-[5/7] w-40 rounded-md border border-border">
            {typeof value === 'string' && value.trim() && <PosterImage src={value.trim()} sizes="160px" />}
          </div>
        </div>
      )
      default: return <Input id={id} required={field.required} value={String(value ?? '')} onChange={e => set(field.name, e.target.value)} />
    }
  }

  const fieldRows = (
    <>
            {fields.map(field => (
              <div key={field.name} className="space-y-2">
                <Label id={`field-${field.name}-label`} htmlFor={`field-${field.name}`} className="text-xs text-muted-foreground">
                  {t(field.labelKey ?? `events.editor.${field.name}`)}{field.required && <span className="text-destructive"> *</span>}
                </Label>
                {control(field)}
              </div>
            ))}
    </>
  )

  if (create || inline) return (
    <form onSubmit={save} className="max-w-xl space-y-5">
      {fieldRows}
      {error && <p role="alert" className="text-meta text-destructive">{error}</p>}
      <div className="flex justify-end"><Button type="submit" pending={pending}>{(create ?? inline)!.label}</Button></div>
    </form>
  )

  return (
    <Sheet open={open} onOpenChange={toggle}>
      <SheetTrigger asChild>
        <Button variant="outline" className={cn('h-[34px] pointer-coarse:h-11 shrink-0 gap-1.5 px-3', triggerClassName)} aria-label={`${t('events.staff.edit')}: ${title}`}><Pencil aria-hidden="true" />{t('events.staff.edit')}</Button>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 sm:max-w-lg">
        <form onSubmit={save} className="flex h-full flex-col">
          <SheetHeader className="px-6 pt-6 pb-2">
            <SheetTitle className="panel-title text-xl">{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {fieldRows}
          </div>
          <SheetFooter className="px-6 pt-2 pb-6">
            {error && <p role="alert" className="text-meta text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => toggle(false)}>{t('events.staff.discard')}</Button>
              <Button type="submit" pending={pending}>{t('events.save')}</Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
