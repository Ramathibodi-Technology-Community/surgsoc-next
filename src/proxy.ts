import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { defaultLocale, locales } from '@/i18n/config'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasLocale = locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))

  if (!hasLocale) {
    const url = request.nextUrl.clone()
    url.pathname = `/${defaultLocale}${pathname}`
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
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
