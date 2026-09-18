import { describe, expect, it } from 'vitest'
import { DEFAULT_EMAIL_FROM, getEmailFromAddress } from '@/libs/email/config'

describe('email config helpers', () => {
  it('prioritizes explicit sender override', () => {
    expect(getEmailFromAddress('Custom <custom@example.com>')).toBe('Custom <custom@example.com>')
  })

  it('falls back to default sender when no override is provided', () => {
    expect(getEmailFromAddress()).toBeTypeOf('string')
  })

  it('exposes a stable default sender constant', () => {
    expect(DEFAULT_EMAIL_FROM).toContain('noreply')
  })
})
