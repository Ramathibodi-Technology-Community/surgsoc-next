import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy, LOCALE_COOKIE } from '@/proxy'

function request(path: string, cookie?: string) {
  const headers = new Headers()
  if (cookie) headers.set('cookie', `${LOCALE_COOKIE}=${cookie}`)
  return new NextRequest(new URL(path, 'https://example.com'), { headers })
}

describe('proxy', () => {
  it('redirects a locale-less path to defaultLocale when no cookie is set', () => {
    const res = proxy(request('/events/4'))
    expect(res.status).toBe(307)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/en/events/4')
  })

  it('redirects a locale-less path to the cookie locale when it is valid', () => {
    const res = proxy(request('/events/4', 'th'))
    expect(new URL(res.headers.get('location')!).pathname).toBe('/th/events/4')
  })

  it('falls back to defaultLocale when the cookie locale is invalid', () => {
    const res = proxy(request('/login', 'fr'))
    expect(new URL(res.headers.get('location')!).pathname).toBe('/en/login')
  })

  it('passes a path that already has a locale through, and sets the cookie to it', () => {
    const res = proxy(request('/th/events/4'))
    expect(res.headers.get('location')).toBeNull()
    expect(res.cookies.get(LOCALE_COOKIE)?.value).toBe('th')
  })

  it('sets the cookie for an en-locale path too', () => {
    const res = proxy(request('/en'))
    expect(res.cookies.get(LOCALE_COOKIE)?.value).toBe('en')
  })
})

describe('proxy cookie churn', () => {
  it('does not re-set the cookie when it already matches the path locale', () => {
    const res = proxy(request('/th/events/4', 'th'))
    expect(res.cookies.get(LOCALE_COOKIE)).toBeUndefined()
  })
})
