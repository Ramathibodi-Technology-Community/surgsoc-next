import { describe, expect, it } from 'vitest'
import { sessionRegistration } from '@/libs/event-application'

const day = (extra: Record<string, unknown> = {}) => ({ id: 2, date_begin: '2999-01-02T09:00:00Z', date_end: '2999-01-02T17:00:00Z', ...extra }) as any
const group = (extra: Record<string, unknown> = {}) => ({ id: 1, event_structure: 'multi_day', ...extra }) as any

describe('sessionRegistration', () => {
  it('is open when neither the group nor the session is closed', () => {
    expect(sessionRegistration(day(), group()).isOpen).toBe(true)
  })

  it('closes every session when the group is switched closed', () => {
    expect(sessionRegistration(day(), group({ status_override: 'closed' })).isOpen).toBe(false)
  })

  it('closes every session when the group has its registration-closed flag set', () => {
    expect(sessionRegistration(day(), group({ is_registration_closed: true })).isOpen).toBe(false)
  })

  it('lets a group forced open lift its own closed flag', () => {
    expect(sessionRegistration(day(), group({ is_registration_closed: true, status_override: 'open' })).isOpen).toBe(true)
  })

  it('honours a closed flag on the session itself', () => {
    expect(sessionRegistration(day({ is_registration_closed: true }), group()).isOpen).toBe(false)
  })
})
