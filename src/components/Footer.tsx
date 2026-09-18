import React from 'react'
import Link from 'next/link'
import { cacheLife } from 'next/cache'
import { getSiteSettings } from '@/libs/site-settings'

/*
  Cached, because `new Date()` below is an unstable value during prerendering
  and would otherwise keep every route dynamic. Worth noting against the
  earlier `react-hooks/purity` call: that rule was switched off on the grounds
  that a server component renders once per request, so `Date.now()` there
  cannot be inconsistent. True then. Under prerendering it is not — the value
  is captured once and baked into static HTML, which is exactly the
  inconsistency the rule was pointing at.

  `cacheLife('days')` means the copyright year can lag by up to a day on
  January 1st. That is the right trade for a footer.
*/
export default async function Footer() {
  'use cache'
  cacheLife('days')
  const { siteName, shortName } = await getSiteSettings()

  return (
    <footer className="mt-auto w-full border-t border-border bg-surface">
      <div className="mx-auto flex max-w-[var(--container-page)] flex-wrap items-start justify-between gap-6 px-4 py-[30px] sm:px-7">
        <div className="flex flex-col gap-1.5">
          <span className="font-display text-[17px] font-bold leading-none">{shortName}</span>
          <span className="text-[13px] leading-relaxed text-muted-foreground">
            © {new Date().getFullYear()} {siteName}
          </span>
        </div>
        <div className="flex flex-wrap gap-7">
          <Link href="/feedback" className="text-[13px] leading-none text-secondary-foreground hover:text-accent">
            Feedback
          </Link>
          <Link href="/terms" className="text-[13px] leading-none text-secondary-foreground hover:text-accent">
            Terms
          </Link>
          <Link href="/privacy" className="text-[13px] leading-none text-secondary-foreground hover:text-accent">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  )
}
