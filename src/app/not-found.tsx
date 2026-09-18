import Link from 'next/link'
import { defaultLocale } from '@/i18n/config'

/**
 * Backstop for requests that never reach the `[locale]` segment at all (bare
 * `/`, or anything else that falls outside every route group below). Since
 * this app has no single root layout — `(frontend)` and `(payload)` each
 * define their own `<html>` — Next treats this file as its own root and
 * requires a full document here. No locale is known at this point, so this
 * stays plain English and minimal; the localized, styled 404 for everything
 * under a locale is `[locale]/(frontend)/not-found.tsx`.
 */
export default function GlobalNotFound() {
  return (
    <html lang={defaultLocale}>
      <body>
        <div style={{ display: 'flex', minHeight: '50vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', textAlign: 'center' }}>
          <h1>Page not found</h1>
          <p>The page you&apos;re looking for doesn&apos;t exist or may have moved.</p>
          <Link href={`/${defaultLocale}`}>Back to home</Link>
        </div>
      </body>
    </html>
  )
}
