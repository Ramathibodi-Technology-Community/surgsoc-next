import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// text-body / text-meta are font sizes from globals.css @theme; without this
// twMerge reads them as colours and drops one when paired with text-muted-foreground.
const twMerge = extendTailwindMerge({ extend: { theme: { text: ['body', 'meta'] } } })

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Hook validation is actionable; database errors must stay server-side. */
export function mutationErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && ['Error', 'ValidationError'].includes(error.name) && !('cause' in error) && !error.message.startsWith('Failed query:') ? error.message : fallback
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  if (error === null || error === undefined) {
    return 'Unknown error'
  }

  try {
    return JSON.stringify(error)
  } catch {
    return 'Unknown error'
  }
}

/**
 * Sanitise a post-login `?redirect=` target. Only same-origin absolute paths are
 * allowed — anything else (protocol-relative `//evil.com`, a full URL, a
 * backslash trick) is an open-redirect vector and falls back to `/account`.
 */
export function safeRedirectPath(value: unknown, fallback = '/account'): string {
  if (typeof value !== 'string' || !value.startsWith('/')) return fallback
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback
  return value
}

export function eventReturnPath(value: unknown): string | undefined {
  return typeof value === 'string' && /^\/(en|th)\/events\/[1-9]\d*\/edit$/.test(value) ? value : undefined
}

/** "3 Oct 2026, 13:00" — staff-facing stamp, pinned to Bangkok like eventWhen(). */
export function formatStamp(value: string | Date | null | undefined, locale: string = 'en'): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(locale === 'th' ? 'th-TH' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Bangkok',
  })
}
