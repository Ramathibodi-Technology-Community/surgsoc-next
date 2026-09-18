'use client'

import React from 'react'
import Link from 'next/link'
import { useTranslation } from '@/i18n/client'
import { Button } from '@/components/ui/button'

/**
 * `not-found.tsx` gets no props (Next.js contract — see not-found.js docs),
 * so it can't read the `[locale]` param directly. It's still nested inside
 * this segment's layout, which already wraps it in `I18nProvider` for the
 * locale that was actually requested, so `useTranslation()` picks that up
 * instead.
 */
export default function NotFound() {
  const { t, locale } = useTranslation()

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="type-h1">{t('not_found.title')}</h1>
      <p className="type-lead max-w-[46ch] text-muted-foreground">{t('not_found.lead')}</p>
      <Button asChild className="mt-2">
        <Link href={`/${locale}`}>{t('not_found.cta')}</Link>
      </Button>
    </div>
  )
}
