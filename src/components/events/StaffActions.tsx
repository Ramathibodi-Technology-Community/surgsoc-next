'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/i18n/client'
import { deleteEvent, duplicateEvent, saveEvent } from '@/app/[locale]/(frontend)/events/manage/actions'
import { releaseReflectionNow } from '@/actions/release-reflection'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ConfirmSwitch } from '@/components/ui/switch'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

// One server call, then refresh; the error sits beside the button that failed.
function useAction() {
  const router = useRouter()
  const { t } = useTranslation()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const run = async (call: () => Promise<unknown>) => {
    setPending(true); setError('')
    try { await call(); router.refresh() }
    catch (failure) { setError(failure instanceof Error ? failure.message : t('events.save_failed')) }
    finally { setPending(false) }
  }
  return { pending, error, run }
}

/* A switch for a state, confirmed in both directions: it changes what members see (design.md § ConfirmSwitch). */
export function PublishToggle({ eventId, visible, applied = 0 }: { eventId: number; visible: boolean; applied?: number }) {
  const { t } = useTranslation()
  const { pending, error, run } = useAction()
  return (
    <span className="flex flex-col items-end gap-1">
      <span className="flex items-center gap-3">
        <span className="flex flex-col items-end">
          <span id="publish-label" className="text-meta font-medium">{t('events.staff.published_label')}</span>
          <span className="text-meta text-muted-foreground">{visible ? t('events.staff.published_on') : t('events.staff.published_off')}</span>
        </span>
        <ConfirmSwitch
          aria-labelledby="publish-label"
          checked={visible}
          pending={pending}
          onConfirm={next => run(() => saveEvent(eventId, { is_visible: next }))}
          on={{ title: t('events.staff.publish_q'), description: t('events.staff.publish_body'), action: t('events.staff.publish'), keep: t('events.staff.keep_draft') }}
          off={{ title: t('events.staff.hide_q'), description: applied > 0 ? t('events.staff.hide_body_count').replace('{count}', String(applied)) : t('events.staff.hide_body'), action: t('events.staff.hide'), keep: t('events.staff.keep_published') }}
        />
      </span>
      {error && <span role="alert" className="text-meta text-destructive">{error}</span>}
    </span>
  )
}

export function ReleaseNow({ eventId }: { eventId: number }) {
  const { t } = useTranslation()
  const { pending, error, run } = useAction()
  return (
    <>
      <Button variant="outline" className="w-full" pending={pending} onClick={() => run(() => releaseReflectionNow(eventId))}>{t('events.release_now')}</Button>
      {error && <p role="alert" className="text-meta text-destructive">{error}</p>}
    </>
  )
}

// Read-only content (server-rendered) behind a quiet link.
export function InfoSheet({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild><Button variant="link" className="h-auto p-0 text-accent">{label}</Button></SheetTrigger>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="px-6 pt-6 pb-2"><SheetTitle className="panel-title text-xl">{title}</SheetTitle></SheetHeader>
        <div className="px-6 py-5">{children}</div>
      </SheetContent>
    </Sheet>
  )
}

/* A single event becomes an event group so it can hold sessions. The server refuses once anyone has applied. */
export function MakeGroup({ eventId }: { eventId: number }) {
  const { t } = useTranslation()
  const { pending, error, run } = useAction()
  return (
    <div className="space-y-3">
      <p className="text-body text-muted-foreground">{t('events.staff.make_group_note')}</p>
      <Button variant="outline" pending={pending} onClick={() => run(() => saveEvent(eventId, { event_structure: 'multi_day' }))}>{t('events.staff.make_group')}</Button>
      {error && <p role="alert" className="text-meta text-destructive">{error}</p>}
    </div>
  )
}

/* Registration on or off, confirmed both ways, with the numbers a person needs to decide (board: Switching off registration). On means the dates decide; off closes it now. */
export function RegistrationSwitch({ eventId, name, open, applied, pending: waiting, closesOn }: { eventId: number; name: string; open: boolean; applied: number; pending: number; closesOn?: string }) {
  const { t } = useTranslation()
  const { pending, error, run } = useAction()
  const fill = (text: string) => text.replace('{name}', name).replace('{applied}', String(applied)).replace('{pending}', String(waiting)).replace('{date}', closesOn ?? '')
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-4">
        <span id={`reg-${eventId}`} className="text-meta font-medium">{t('events.staff.registration_open_label')}</span>
        <ConfirmSwitch
          aria-labelledby={`reg-${eventId}`}
          checked={open}
          pending={pending}
          onConfirm={next => run(() => saveEvent(eventId, { status_override: next ? 'auto' : 'closed' }))}
          on={{ title: t('events.staff.reg_open_q'), description: t('events.staff.reg_open_body'), action: t('events.staff.reg_open'), keep: t('events.staff.reg_keep_closed') }}
          off={{ title: fill(t('events.staff.reg_close_q')), description: fill(closesOn ? t('events.staff.reg_close_body_date') : t('events.staff.reg_close_body')), action: t('events.staff.reg_close'), keep: t('events.staff.reg_keep_open') }}
        />
      </div>
      {error && <span role="alert" className="text-meta text-destructive">{error}</span>}
    </div>
  )
}

/* Settings > Copy or remove. Delete is only for events nobody has applied to; the server is the backstop. */
export function EventCopyRemove({ eventId, hasApplicants }: { eventId: number; hasApplicants: boolean }) {
  const { t } = useTranslation()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const go = async (call: () => Promise<string | void>) => {
    setBusy(true); setError('')
    try { const to = await call(); router.push(to || '/events/manage') } catch (failure) { setError(failure instanceof Error ? failure.message : t('events.save_failed')); setBusy(false); setDeleting(false) }
  }
  return (
    <section className="space-y-4">
      <h2 className="type-h2">{t('events.staff.copy_or_remove')}</h2>
      <div className="flex items-center justify-between gap-4"><div><p className="font-medium">{t('events.staff.duplicate_event')}</p><p className="text-meta text-muted-foreground">{t('events.staff.duplicate_note')}</p></div><Button variant="outline" disabled={busy} onClick={() => go(async () => `/events/${await duplicateEvent(eventId, t('events.staff.copy_of'))}/edit`)}>{t('events.staff.duplicate')}</Button></div>
      <div className="flex items-center justify-between gap-4"><div><p className="font-medium">{t('events.staff.delete_event')}</p><p className="text-meta text-muted-foreground">{t('events.staff.delete_note')}</p></div><Button variant="outline" className="border-destructive/60 text-destructive hover:bg-destructive/10" disabled={busy || hasApplicants} onClick={() => setDeleting(true)}>{t('events.staff.delete')}</Button></div>
      {error && <p role="alert" className="text-meta text-destructive">{error}</p>}
      <ConfirmDialog open={deleting} onOpenChange={setDeleting} title={t('events.staff.delete_q')} description={t('events.staff.delete_body')} action={t('events.staff.delete')} keep={t('events.staff.keep_event')} destructive pending={busy} onConfirm={() => go(async () => { await deleteEvent(eventId) })} />
    </section>
  )
}

/* The last step of setup: publish, then land on the finished event. */
export function PublishNow({ eventId, label }: { eventId: number; label: string }) {
  const router = useRouter()
  const { pending, error, run } = useAction()
  return (
    <span className="flex flex-col items-end gap-1">
      <Button pending={pending} onClick={() => run(async () => { await saveEvent(eventId, { is_visible: true }); router.push(`/events/${eventId}/edit`) })}>{label}</Button>
      {error && <span role="alert" className="text-meta text-destructive">{error}</span>}
    </span>
  )
}
