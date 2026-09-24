import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { defaultLocale, locales } from '@/i18n/config'

// Remembers which locale a visitor is actually browsing in, so a locale-less
// internal link (there are ~40 of them: `/events/4`, `/login`, …) sends a
// `/th/...` visitor back to `/th/...` instead of always to `defaultLocale`.
export const LOCALE_COOKIE = 'NEXT_LOCALE'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const matchedLocale = locales.find((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))

  if (!matchedLocale) {
    const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value
    const locale = (locales as readonly string[]).includes(cookieLocale ?? '')
      ? (cookieLocale as (typeof locales)[number])
      : defaultLocale
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}${pathname}`
    return NextResponse.redirect(url)
  }

  const response = NextResponse.next()
  // Only when it changes, so ordinary page loads don't all carry a Set-Cookie.
  if (request.cookies.get(LOCALE_COOKIE)?.value === matchedLocale) return response
  response.cookies.set(LOCALE_COOKIE, matchedLocale, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })
  return response
}

export const config = {
  matcher: [
    /*
      Skip internal paths and any request for a file (anything with an
      extension) — public/ assets must not be rewritten into a locale path.

      Next's metadata routes are the exception: app/icon.tsx generates /icon
      and /apple-icon with no extension and no [locale] copy, so both fell
      through to the redirect and 404'd at /en/icon. Anchored with $ so only
      those exact paths are exempt — a bare `icon` would also skip a future
      /iconography page. Spelt as two alternatives rather than one group
      because Next rejects capturing groups in a matcher. Add opengraph-image
      and manifest here if they appear.
    */
    '/((?!api|_next/static|_next/image|admin|icon$|apple-icon$|.*\\..*).*)',
  ],
}
