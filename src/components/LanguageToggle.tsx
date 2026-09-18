'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { locales, defaultLocale, type Locale } from '@/i18n/config'
import { cn } from '@/libs/utils'

export function LanguageToggle({ className }: { className?: string }) {
  const pathname = usePathname()

  // Strip any locale prefix, then re-add the target one. The default locale is
  // served unprefixed, so switching to it means removing the segment entirely.
  const pathWithoutLocale = (() => {
    for (const loc of locales) {
      if (pathname === `/${loc}`) return '/'
      if (pathname.startsWith(`/${loc}/`)) return pathname.slice(loc.length + 1)
    }
    return pathname || '/'
  })()

  const current: Locale =
    locales.find((loc) => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)) ?? defaultLocale

  const urlFor = (locale: Locale) =>
    locale === defaultLocale ? pathWithoutLocale : `/${locale}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`

  return (
    <div className={cn('flex overflow-hidden rounded-[10px] border border-border-strong', className)}>
      {locales.map((locale) => (
        <Link
          key={locale}
          href={urlFor(locale)}
          aria-current={locale === current ? 'true' : undefined}
          className={cn(
            'text-[11px] font-semibold leading-none px-2.5 py-2 transition-colors',
            locale === current
              ? 'bg-secondary text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {locale.toUpperCase()}
        </Link>
      ))}
    </div>
  )
}
