import React from 'react'
import '../../globals.css'
import Header from '../../../components/Header'
import Footer from '../../../components/Footer'
import { Noto_Serif_Thai, IBM_Plex_Sans_Thai } from 'next/font/google'
import { Locale, locales } from '@/i18n/config'
import { getDictionary } from '@/i18n/server'
import { I18nProvider } from '@/i18n/client'
import { getSiteSettings } from '@/libs/site-settings'

// Two faces, two jobs. Noto Serif Thai covers Latin and Thai in one family, so
// headings need no script fallback and a Thai title sits at the same weight as
// an English one. Plex Sans Thai runs the interface, captions included.
//
// There was a third — Plex Mono — carrying every label, status, date and count
// in uppercase with 0.15em tracking. That combination, not the typeface, was
// what made the interface read as generated, so the roles moved to Plex Sans in
// sentence case and the family came off the wire entirely.
const display = Noto_Serif_Thai({
  weight: ['400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  variable: '--font-display-family',
  display: 'swap',
})
const sans = IBM_Plex_Sans_Thai({
  weight: ['400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  variable: '--font-sans-family',
  display: 'swap',
})
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
      <body className={`flex flex-col min-h-screen bg-background text-foreground ${display.variable} ${sans.variable} font-sans antialiased`}>
        <I18nProvider locale={locale} dictionary={dictionary}>
          <Header />
          {/*
            One column for the whole site: 1100px with a 28px gutter, 44px above
            the content and 80px below. Pages set no outer padding of their own.
          */}
          <main className="flex-grow w-full max-w-[var(--container-page)] mx-auto px-4 pt-8 pb-16 sm:px-7 sm:pt-11 sm:pb-20">
            {children}
          </main>
          <Footer />
        </I18nProvider>
      </body>
    </html>
  )
}
