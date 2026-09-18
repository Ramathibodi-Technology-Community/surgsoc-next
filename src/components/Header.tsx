import React, { Suspense } from 'react'
import Link from 'next/link'
import LogoWithFallback from './LogoWithFallback'
import MobileMenu from './MobileMenu'
import HeaderNav from './HeaderNav'
import { LanguageToggle } from './LanguageToggle'
import { getSiteSettings } from '@/libs/site-settings'
import HeaderAuth, { HeaderAuthFallback } from './HeaderAuth'

export default async function Header() {
  const { enableI18n, siteName, shortName } = await getSiteSettings()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-surface">
      {/*
        No wrapping below sm — at 390px the wordmark and the controls just fit
        once the gutter and gaps tighten, and wrapping stranded the logo alone
        on its own row.
      */}
      <div className="mx-auto flex min-h-[68px] max-w-[var(--container-page)] items-center justify-between gap-3 px-4 sm:flex-wrap sm:gap-5 sm:px-7">
        {/* Wordmark: mark, name, and the society's full title beneath it. */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5 py-3">
          <LogoWithFallback />
          <span className="flex flex-col gap-[3px]">
            <span className="font-display text-[19px] font-bold leading-none">{shortName}</span>
            {/* Sentence case, like every other caption. The society's name is a
                name, not a label — setting it in caps was the same tell. */}
            <span className="hidden text-[11px] leading-none text-muted-foreground sm:inline">
              {siteName}
            </span>
          </span>
        </Link>

        {/*
          HeaderNav, MobileMenu and LanguageToggle all read usePathname() for
          active-link state and locale switching. Under cacheComponents that is
          URL data, so each needs its own boundary or it holds the whole header
          back from prerendering. Fallbacks are sized to the real control so
          the bar does not reflow when they resolve — same rule as
          HeaderAuthFallback below.
        */}
        <Suspense fallback={<div className="hidden md:flex h-[38px] w-[260px] shrink-0" />}>
          <HeaderNav />
        </Suspense>

        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <Suspense fallback={<div className="h-[34px] w-[34px] shrink-0 md:hidden" />}>
            <MobileMenu enableI18n={enableI18n} />
          </Suspense>
          {/*
            At 320px the wordmark, hamburger, EN|TH toggle and Sign in button
            together needed 320px of a 288px row — the Sign in button ran off
            the right edge. The toggle is the one control here that already has
            a home inside the menu sheet, so it steps out of the bar below sm
            and MobileMenu renders it instead.
          */}
          {enableI18n && (
            <Suspense fallback={<div className="hidden h-[34px] w-[62px] shrink-0 sm:block" />}>
              <LanguageToggle className="hidden sm:flex" />
            </Suspense>
          )}

          {/*
            The session lookup is the only per-visitor part of this bar, so it
            streams in on its own instead of holding the page back. See
            HeaderAuth for why that matters.
          */}
          <Suspense fallback={<HeaderAuthFallback />}>
            <HeaderAuth />
          </Suspense>
        </div>
      </div>
    </header>
  )
}
