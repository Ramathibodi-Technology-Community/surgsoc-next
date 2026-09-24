import { expect, test } from 'vitest'
import { prefillFormData, getNestedValue } from '@/libs/forms/prefillUserData'

test('prefills a populated year as text rather than an object', () => {
  const user = { academic: { year: { id: 4, label: 'Year 4', slug: 'year-4' } } }
  expect(prefillFormData(user, [{ name: 'year', blockType: 'text' }]).year).toBe('Year 4')
  expect(getNestedValue(user, 'academic.year')).toBe('Year 4')
  expect(prefillFormData(user, [{ name: 'year', blockType: 'number' }]).year).toBe('4')
  expect(prefillFormData(user, [{ name: 'year', blockType: 'select', options: [
    { label: 'Fourth year', value: 'year-4' },
  ] }]).year).toBe('year-4')
})

test('does not prefill a number year from an unpopulated tag id', () => {
  const user = { academic: { year: 17 } }
  expect(prefillFormData(user, [{ name: 'year', blockType: 'number' }]).year).toBeUndefined()
})
