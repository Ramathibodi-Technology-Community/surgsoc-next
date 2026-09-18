import { describe, expect, it } from 'vitest'
import {
  formatNotificationDate,
  getFormAssignmentUrl,
  getNotificationBaseUrl,
  getPreferredRecipientName,
  getRegistrationDecisionUrls,
} from '@/libs/notifications/shared'

describe('notification shared helpers', () => {
  it('uses configured base URL and trims trailing slash', () => {
    const base = getNotificationBaseUrl({ NEXT_PUBLIC_SERVER_URL: 'https://example.com/' })
    expect(base).toBe('https://example.com')
  })

  it('falls back to localhost in non-production when base URL is missing', () => {
    const base = getNotificationBaseUrl({ NODE_ENV: 'development' })
    expect(base).toBe('http://localhost:3000')
  })

  it('throws in production when base URL is missing', () => {
    expect(() => getNotificationBaseUrl({ NODE_ENV: 'production' })).toThrow(
      'NEXT_PUBLIC_SERVER_URL is required in production for email links',
    )
  })

  it('builds user display name with fallback to email', () => {
    expect(getPreferredRecipientName({ name_english: { first_name: 'Amy' }, email: 'amy@example.com' })).toBe('Amy')
    expect(getPreferredRecipientName({ email: 'amy@example.com' })).toBe('amy@example.com')
    expect(getPreferredRecipientName({})).toBe('Member')
  })

  it('builds registration decision URLs', () => {
    const urls = getRegistrationDecisionUrls('https://example.com', 10, 999)
    expect(urls.confirmUrl).toBe('https://example.com/events/10/confirm?registrationId=999')
    expect(urls.declineUrl).toBe('https://example.com/events/10/decline?registrationId=999')
  })

  it('builds form assignment URL', () => {
    expect(getFormAssignmentUrl('https://example.com', 'abc')).toBe('https://example.com/forms/abc')
  })

  it('formats dates to locale string without throwing', () => {
    expect(formatNotificationDate('2026-03-08T00:00:00.000Z')).toBeTypeOf('string')
  })
})
