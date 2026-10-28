import React from 'react'
import type { Metadata } from 'next'
import { getDictionary } from '@/i18n/server'
import { Locale } from '@/i18n/config'
import PageHeader from '@/components/PageHeader'
import ComingSoon from '@/components/ComingSoon'

export const metadata: Metadata = {
  title: 'Attending Physicians | RASS',
  description: 'Our advisor physicians at Ramathibodi Surgical Society.',
}

/*
  Switched off to "coming soon" until each attending has confirmed they are
  happy to be listed (PDPA), so this page queries and renders no records. The
  grouped roster it used to render is in git history (before this change).
*/
export default async function AttendingsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params as { locale: Locale }
  const t = (await getDictionary(locale)).attendings

  return (
    <>
      <PageHeader title={t.title} lead={t.subtitle} />
      <ComingSoon title={t.coming_soon} note={t.coming_soon_note} />
    </>
  )
}
