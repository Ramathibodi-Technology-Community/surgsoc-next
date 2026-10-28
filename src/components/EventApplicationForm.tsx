'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PayloadForm from './PayloadForm'
import { submitEventApplication } from '@/app/[locale]/(frontend)/events/[id]/actions'
import { useTranslation } from '@/i18n/client'
import { Checkbox } from '@/components/ui/checkbox'
import { formatStamp } from '@/libs/utils'

export default function EventApplicationForm({ eventId, form, user, days }: { eventId: number; form: any; user: any; days?: { id: number; name: string; date_begin: string }[] }) {
  const [selected, setSelected] = useState<number[]>([])
  const router = useRouter()
  const { t, locale } = useTranslation()
  const submit = async (data: Record<string, unknown>) => {
    if (days && !selected.length) throw new Error(t('events.choose_days'))
    await submitEventApplication(eventId, data, days ? selected : undefined)
    router.push(`/${locale}/events/${eventId}?applied=1`)
    router.refresh()
  }
  return <PayloadForm form={form} user={user} onSubmit={submit}>
    {days && <fieldset className="space-y-3"><legend className="panel-title mb-tight">{t('events.choose_days')}</legend>
      {days.map(day => <label key={day.id} className="flex cursor-pointer items-start gap-3 rounded-md border border-input bg-card p-4">
        <Checkbox className="mt-1" checked={selected.includes(day.id)} onCheckedChange={checked => setSelected(old => checked ? [...old, day.id] : old.filter(id => id !== day.id))} />
        <span lang={locale} className="text-body">{day.name}<span className="mt-0.5 block text-meta text-muted-foreground">{formatStamp(day.date_begin, locale)}</span></span>
      </label>)}
    </fieldset>}
  </PayloadForm>
}
