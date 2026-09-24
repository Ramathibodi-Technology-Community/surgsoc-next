import { expect, test, vi } from 'vitest'
import { Users } from '@/collections/Users'

const hook = (Users.hooks!.beforeChange as any[])[0]
const originalDoc = {
  id: 1,
  email: 'person@student.mahidol.ac.th',
  roles: ['visitor'],
  student_email_verified: true,
  name_thai: { first_name: 'สม', last_name: 'ใจ' },
  academic: { student_id: '1234567', year: 2 },
}
const payload = { find: vi.fn(async () => ({ docs: [] })) }

test('promotes a visitor with a verified student email and complete profile', async () => {
  const data: Record<string, unknown> = {}
  await hook({ data, originalDoc, req: { payload, context: {}, user: null } })
  expect(data.roles).toEqual(['member'])
})

test('does not trust a visitor-supplied email verification flag', async () => {
  const data: Record<string, unknown> = { student_email_verified: true }
  await hook({
    data,
    originalDoc: { ...originalDoc, student_email_verified: false },
    req: { payload, context: {}, user: { id: 1, roles: ['visitor'], groups: [] } },
  })
  expect(data.roles).toBeUndefined()
  expect(data.student_email_verified).toBeUndefined()
})

test('does not promote an invalid student ID or old email domain', async () => {
  for (const doc of [
    { ...originalDoc, academic: { student_id: '123456', year: 2 } },
    { ...originalDoc, email: 'person@mahidol.edu' },
  ]) {
    const data: Record<string, unknown> = {}
    await hook({ data, originalDoc: doc, req: { payload, context: {}, user: null } })
    expect(data.roles).toBeUndefined()
  }
})

test('lets an existing member with a legacy gap save, but not blank a filled field', async () => {
  const member = { ...originalDoc, roles: ['member'], academic: { student_id: 'u651234', year: 2 } }
  const actor = { id: 1, roles: ['member'], groups: [] }

  await expect(hook({
    data: { name_thai: { first_name: 'สมชาย', last_name: 'ใจ' } },
    originalDoc: member,
    req: { payload, context: {}, user: actor },
  })).resolves.toBeDefined()

  await expect(hook({
    data: { name_thai: { first_name: '', last_name: 'ใจ' } },
    originalDoc: member,
    req: { payload, context: {}, user: actor },
  })).rejects.toThrow('Thai First Name')
})

test('a manager demoting a member to visitor is not overridden', async () => {
  const data: Record<string, unknown> = { roles: ['visitor'] }
  await hook({ data, originalDoc: { ...originalDoc, roles: ['member'] }, req: { payload, context: {}, user: null } })
  expect(data.roles).toEqual(['visitor'])
})
