import { describe, expect, it } from 'vitest'
import { validateEmailDomain } from '@/libs/auth/email-domain'

describe('validateEmailDomain', () => {
  it('accepts mahidol.edu and mahidol.ac.th, bare or under any subdomain', () => {
    expect(validateEmailDomain('someone@student.mahidol.edu')).toBe(true)
    expect(validateEmailDomain('someone@student.mahidol.ac.th')).toBe(true)
    expect(validateEmailDomain('someone@mahidol.edu')).toBe(true)
    expect(validateEmailDomain('someone@mahidol.ac.th')).toBe(true)
    expect(validateEmailDomain(' Someone@Med.Mahidol.AC.TH ')).toBe(true)
  })

  it('rejects other domains and empty values', () => {
    expect(validateEmailDomain('someone@example.com')).toBe(false)
    expect(validateEmailDomain('someone@notmahidol.edu')).toBe(false)
    expect(validateEmailDomain('someone@mahidol.edu.evil.com')).toBe(false)
    expect(validateEmailDomain('someone@mahidol.com')).toBe(false)
    expect(validateEmailDomain('')).toBe(false)
  })
})
