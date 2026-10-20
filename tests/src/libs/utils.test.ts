import { describe, expect, it } from 'vitest'
import { getErrorMessage, eventReturnPath } from '@/libs/utils'

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

it('returns only local event-editor destinations', () => {
  expect(eventReturnPath('/th/events/12/edit')).toBe('/th/events/12/edit')
  for (const path of ['https://example.com', '//example.com', '/en/admin', '/en/events/0/edit', '/en/events/1/edit?next=//evil', '/en/events/1/edit/../admin']) expect(eventReturnPath(path)).toBeUndefined()
})
