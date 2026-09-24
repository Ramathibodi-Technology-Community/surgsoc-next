import { expect, test } from 'vitest'
import { getMissingProfileFields } from '@/libs/profile-completion'

test('member profile requires Thai names, a seven-digit ID and year', () => {
  const profile = {
    name_thai: { first_name: 'สม', last_name: 'ใจ' },
    academic: { student_id: '1234567', year: { id: 2, label: 'Year 2' } },
  }
  expect(getMissingProfileFields(profile)).toEqual([])
  expect(getMissingProfileFields({ ...profile, academic: { student_id: '123456', year: null } }))
    .toEqual(['7-digit Student ID', 'Year'])
})
