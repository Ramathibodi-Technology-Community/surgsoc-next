import { describe, expect, it } from 'vitest'
import { validateEmailDomain } from '@/libs/auth/google'

describe('validateEmailDomain', () => {
  it('accepts organization domains', () => {
    expect(validateEmailDomain('someone@mahidol.edu')).toBe(true)
    expect(validateEmailDomain('someone@student.mahidol.edu')).toBe(true)
  })

  it('rejects other domains and empty values', () => {
    expect(validateEmailDomain('someone@example.com')).toBe(false)
    expect(validateEmailDomain('')).toBe(false)
  })
})
