import React from 'react'
import '../../globals.css'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import type { Viewport } from 'next'
import { Anuphan } from 'next/font/google'
import { Locale, locales } from '@/i18n/config'
import { getDictionary } from '@/i18n/server'
import { I18nProvider } from '@/i18n/client'
import { getSiteSettings } from '@/libs/site-settings'

// One family, every role. Anuphan covers Thai and Latin in a single design, so a
// Thai title and an English one share a weight and a rhythm; hierarchy comes
// from size and weight, not from a second face. (Chosen 2026-10-05 from the
// type options board; it replaces Noto Serif Thai + IBM Plex Sans Thai.)
// The variable lands on <body>, so globals.css redeclares --font-sans and
// --font-display there; otherwise Tailwind resolves them at :root, where the
// variable does not exist, and the page falls back to the system font.
const sans = Anuphan({
  weight: ['400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  variable: '--font-sans-family',
  display: 'swap',
})
// Dark-only site: tint the mobile browser chrome to match --background (base-0).
export const viewport: Viewport = { themeColor: '#1b1e22' }

export async function generateMetadata() {
  const { siteName, metaDescription } = await getSiteSettings()
  return { title: siteName, description: metaDescription }
}

// Nearly every page under this layout reads `headers()` for `payload.auth()` to
// personalize CTAs and gate content per user — genuinely per-request, not
// something `use cache`/Suspense should paper over. `instant = false` here (the
// lowest ancestor common to all of them) tells cacheComponents that's expected,
// instead of every leaf page repeating the same opt-out.
export const instant = false

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function RootLayout({
  children,
  params,
}: Props) {
  const { locale } = await params as { locale: Locale }
  const dictionary = await getDictionary(locale)

  return (
    <html lang={locale} className="scroll-smooth" data-scroll-behavior="smooth">
      <body className={`flex flex-col min-h-screen bg-background text-foreground ${sans.variable} font-sans antialiased`}>
        <I18nProvider locale={locale} dictionary={dictionary}>
          <a
            href="#main"
            className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-3 focus-visible:z-[100] focus-visible:rounded-md focus-visible:bg-primary focus-visible:px-3.5 focus-visible:py-2 focus-visible:text-sm focus-visible:font-medium focus-visible:text-primary-foreground"
          >
            {dictionary.nav.skip_to_content}
          </a>
          <Header />
          {/*
            One column for the whole site: 1100px with a 28px gutter, 44px above
            the content and 80px below. Pages set no outer padding of their own.
          */}
          <main id="main" tabIndex={-1} className="focus:outline-none flex-grow w-full max-w-[var(--container-page)] mx-auto px-4 pt-8 pb-16 sm:px-7 sm:pt-11 sm:pb-20">
            {children}
          </main>
          <Footer />
        </I18nProvider>
      </body>
    </html>
  )
}
