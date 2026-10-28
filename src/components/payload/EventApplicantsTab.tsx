'use client'

import { useCallback, useEffect, useState } from 'react'
import { useDocumentInfo, useTranslation } from '@payloadcms/ui'
import ApplicantPoolManager from '@/components/ApplicantPoolManager'
import styles from './EventApplicantsTab.module.css'
import { I18nProvider } from '@/i18n/client'
import events from '@/i18n/locales/en/events.json'
import thaiEvents from '@/i18n/locales/th/events.json'

export const EventApplicantsTab = () => {
  const { id } = useDocumentInfo()
  const { i18n } = useTranslation()
  const locale = i18n.language === 'th' ? 'th' : 'en'
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const load = useCallback(async (signal?: AbortSignal) => {
    if (!id || id === 'create') return
    try {
      const response = await fetch(`/api/events/${id}/applicants`, { signal })
      if (!response.ok) throw new Error('You cannot view this event’s applicants.')
      setData(await response.json()); setError('')
    } catch (failure) { if (!signal?.aborted) setError(failure instanceof Error ? failure.message : 'Could not load applicants.') }
  }, [id])
  useEffect(() => { const controller = new AbortController(); setData(null); void load(controller.signal); return () => controller.abort() }, [load])
  if (error) return <p role="alert">{error}</p>
  if (!data) return <p>Loading applicants…</p>
  return <I18nProvider locale={locale} dictionary={{ events: locale === 'th' ? thaiEvents : events }}><div className={styles.container}>{data.days?.map((day: any) => <a className="mr-4" key={day.id} href={`/admin/collections/events/${day.id}/applicants`}>{day.name}</a>)}<ApplicantPoolManager eventId={String(id)} applicants={data.applicants} participantLimit={data.participantLimit} onRefresh={() => { void load() }} /></div></I18nProvider>
}
