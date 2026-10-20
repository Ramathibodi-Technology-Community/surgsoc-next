import { describe, expect, it } from 'vitest'
import { validateFormAnswers, validateFormDefinition } from '@/libs/forms/validation'
import { prefillFormData } from '@/libs/forms/prefillUserData'

const field = { blockType: 'text', name: 'reason', required: true }
describe('canonical form validation', () => {
  it('rejects unknown, duplicate and missing answers at the server boundary', () => {
    const form = { fields: [field] }
    expect(() => validateFormAnswers(form, [{ field: 'unknown', value: 'x' }], null)).toThrow('Unknown')
    expect(() => validateFormAnswers(form, [{ field: 'reason', value: 'x' }, { field: 'reason', value: 'y' }], null)).toThrow('duplicate')
    expect(() => validateFormAnswers(form, [], null)).toThrow('required')
  })
  it('ignores hidden required fields and canonicalizes read-only profile values before evaluating conditions', () => {
    const form = { fields: [{ blockType: 'userProfile', name: 'email', profileField: 'email', readOnly: true }, { ...field, conditional: { enabled: true, source_field: 'email', operator: 'equals', value: 'other@example.com', action: 'show' } }] }
    expect(validateFormAnswers(form, [{ field: 'email', value: 'forged@example.com' }], { email: 'real@example.com' })).toEqual([{ field: 'email', value: 'real@example.com' }])
  })
  it('validates multi-choice values without accepting comma-serialized or repeated choices', () => {
    const form = { fields: [{ name: 'days', blockType: 'checkboxGroup', minSelect: 1, maxSelect: 2, options: [{ value: 'a' }, { value: 'b' }] }] }
    expect(validateFormAnswers(form, [{ field: 'days', value: '["a","b"]' }], null)[0].value).toBe('["a","b"]')
    expect(() => validateFormAnswers(form, [{ field: 'days', value: '["a","a"]' }], null)).toThrow('invalid choices')
  })
  it('rejects bad slider steps, ranking membership and definition sources', () => {
    expect(() => validateFormAnswers({ fields: [{ name: 'rating', blockType: 'slider', min: 0, max: 10, step: 2 }] }, [{ field: 'rating', value: '3' }], null)).toThrow('range')
    expect(() => validateFormAnswers({ fields: [{ name: 'ranking', blockType: 'ranking', options: [{ value: 'a' }, { value: 'b' }] }] }, [{ field: 'ranking', value: '["a"]' }], null)).toThrow('rank every')
    expect(() => validateFormDefinition({ title: 'Form', fields: [{ ...field, conditional: { enabled: true, source_field: 'missing' } }] })).toThrow('conditional')
  })
  it('initializes profile blocks once with scalar relationship labels', () => {
    expect(prefillFormData({ academic: { track: { id: 1, label: 'MD' } } }, [{ name: 'track_value', blockType: 'userProfile', profileField: 'academic.track' }])).toEqual({ track_value: 'MD' })
  })
})
