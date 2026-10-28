'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTranslation } from '@/i18n/client'
import { saveGalleryLinks } from '@/app/[locale]/(frontend)/events/manage/actions'

/* Photo albums for the event: a title and a link each. Members see them on the event page once it has ended. */
export default function GalleryLinks({ eventId, initial }: { eventId: number; initial: { title: string; url: string }[] }) {
  const { t } = useTranslation()
  const router = useRouter()
  const [links, setLinks] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const set = (i: number, patch: Partial<{ title: string; url: string }>) => setLinks(old => old.map((link, j) => j === i ? { ...link, ...patch } : link))
  const save = async () => {
    setBusy(true); setMessage('')
    try { await saveGalleryLinks(eventId, links); setMessage(t('events.staff.saved')); router.refresh() }
    catch (error) { setMessage(error instanceof Error ? error.message : '') }
    setBusy(false)
  }
  return (
    <section className="space-y-3 rounded-md border border-border bg-card p-[22px]">
      <h2 className="panel-title">{t('events.staff.photos')}</h2>
      <p className="text-meta text-muted-foreground">{t('events.staff.photos_note')}</p>
      {links.map((link, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input aria-label={t('events.staff.photo_title')} placeholder={t('events.staff.photo_title')} value={link.title} onChange={e => set(i, { title: e.target.value })} />
          <Input aria-label="URL" placeholder="https://" inputMode="url" value={link.url} onChange={e => set(i, { url: e.target.value })} />
          <Button type="button" variant="ghost" size="icon" aria-label={t('events.staff.remove')} onClick={() => setLinks(old => old.filter((_, j) => j !== i))}><X /></Button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={() => setLinks(old => [...old, { title: '', url: '' }])}><Plus />{t('events.staff.add_photo_link')}</Button>
        <Button type="button" pending={busy} onClick={save}>{t('events.staff.save')}</Button>
        {message && <span role="status" className="text-meta text-muted-foreground">{message}</span>}
      </div>
    </section>
  )
}
