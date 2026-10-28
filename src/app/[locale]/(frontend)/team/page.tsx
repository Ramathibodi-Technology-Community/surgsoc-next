import React from 'react'
import type { Metadata } from 'next'
import { getDictionary } from '@/i18n/server'
import { Locale } from '@/i18n/config'
import PageHeader from '@/components/PageHeader'
import ComingSoon from '@/components/ComingSoon'

export const metadata: Metadata = {
  title: 'Our Team | RASS',
  description: 'Meet the staff of Ramathibodi Surgical Society, past and present.',
}

/*
  Switched off to "coming soon": the roster read `academic_year` as text after it
  became a relation to academic-terms, so the year rendered as "[object Object]".
  TeamRoster and libs/team-roster are kept for when the page returns.
*/
export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params as { locale: Locale }
  const t = (await getDictionary(locale)).team

  return (
    <>
      <PageHeader title={t.title} lead={t.subtitle} />
      <ComingSoon title={t.coming_soon} note={t.coming_soon_note} />
    </>
  )
}
