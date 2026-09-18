import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
