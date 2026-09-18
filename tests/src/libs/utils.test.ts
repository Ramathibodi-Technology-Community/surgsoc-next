import { describe, expect, it } from 'vitest'
import { getErrorMessage } from '@/libs/utils'

describe('getErrorMessage', () => {
  it('returns message from Error instances', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom')
  })

  it('returns string values directly', () => {
    expect(getErrorMessage('plain text error')).toBe('plain text error')
  })

  it('returns fallback for nullish values', () => {
    expect(getErrorMessage(null)).toBe('Unknown error')
    expect(getErrorMessage(undefined)).toBe('Unknown error')
  })

  it('stringifies non-error objects when possible', () => {
    expect(getErrorMessage({ code: 'E_TEST', detail: 1 })).toBe('{"code":"E_TEST","detail":1}')
  })
})
