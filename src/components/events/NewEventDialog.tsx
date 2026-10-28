'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog } from 'radix-ui'
import { useTranslation } from '@/i18n/client'
import { saveEvent } from '@/app/[locale]/(frontend)/events/manage/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DateTimePicker } from '@/components/ui/date-time-picker'

/*
  Board "0 · New event dialog": three answers (single or group, name, start) make a hidden
  draft; everything else lives on the event's own page, edited in place.
*/
export default function NewEventDialog({ variant = 'outline' }: { variant?: 'default' | 'outline' }) {
  const { t } = useTranslation()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<'standalone' | 'multi_day'>('standalone')
  const [name, setName] = useState('')
  const [begin, setBegin] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!begin) { setError(t('events.staff.new_needs_start')); return }
    setPending(true); setError('')
    try {
      const id = await saveEvent(null, { name: name.trim(), event_structure: kind, date_begin: begin, is_visible: false })
      router.push(kind === 'multi_day' ? `/events/${id}/edit?step=basics` : `/events/${id}/edit`)
    } catch (failure) { setError(failure instanceof Error ? failure.message : t('events.save_failed')); setPending(false) }
  }

  const choice = (value: typeof kind, title: string, note: string) => (
    <label className="flex cursor-pointer gap-3 rounded-md border border-border px-3.5 py-3 has-[:checked]:border-accent has-[:checked]:bg-card has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50">
      <input type="radio" name="kind" className="mt-1 accent-[var(--accent)]" checked={kind === value} onChange={() => setKind(value)} />
      <span><span className="block text-body">{title}</span><span className="text-meta text-muted-foreground">{note}</span></span>
    </label>
  )

  return (
    <Dialog.Root open={open} onOpenChange={next => { setOpen(next); if (!next) { setError(''); setPending(false) } }}>
      <Dialog.Trigger asChild><Button variant={variant}>{t('events.new_event')}</Button></Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-md bg-surface p-[26px] text-foreground shadow-[var(--shadow-lifted)]">
          <form onSubmit={create} className="flex flex-col gap-4">
            <div>
              <Dialog.Title className="text-xl font-semibold">{t('events.new_event')}</Dialog.Title>
              <Dialog.Description className="mt-1 text-meta text-muted-foreground"><span className="text-destructive">*</span> {t('events.staff.required')} · {t('events.staff.new_event_note')}</Dialog.Description>
            </div>
            <div role="radiogroup" aria-label={t('events.editor.event_structure')} className="grid grid-cols-2 gap-2">
              {choice('standalone', t('events.structure.standalone'), t('events.staff.kind_single_note'))}
              {choice('multi_day', t('events.structure.multi_day'), t('events.staff.kind_group_note'))}
            </div>
            <div className="space-y-2"><Label htmlFor="new-event-name" className="text-xs text-muted-foreground">{t('events.editor.name')} <span className="text-destructive">*</span></Label><Input id="new-event-name" required autoFocus value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="space-y-2"><Label className="text-xs text-muted-foreground">{t('events.editor.date_begin')} <span className="text-destructive">*</span></Label><DateTimePicker required label={t('events.editor.date_begin')} value={begin} onChange={setBegin} /></div>
            {error && <p role="alert" className="text-meta text-destructive">{error}</p>}
            <div className="mt-2 flex justify-end gap-2.5">
              <Dialog.Close asChild><Button type="button" variant="outline" disabled={pending}>{t('events.cancel')}</Button></Dialog.Close>
              <Button type="submit" pending={pending}>{t('events.staff.create_draft')}</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
