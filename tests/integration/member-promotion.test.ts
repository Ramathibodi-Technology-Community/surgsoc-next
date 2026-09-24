import { randomUUID } from 'node:crypto'
import { expect, test } from 'vitest'
import { getMissingProfileFields } from '@/libs/profile-completion'

test.skipIf(process.env.RUN_DATABASE_TESTS !== '1')(
  'verified student becomes a member after completing the profile',
  async () => {
    const [{ getPayload }, { default: config }] = await Promise.all([
      import('payload'),
      import('@/payload.config'),
    ])
    const payload = await getPayload({ config })
    const suffix = randomUUID()
    const year = await payload.create({
      collection: 'tags',
      data: { kind: 'year', label: 'Year 1', slug: `year-test-${suffix}` },
    })
    let userId: number | undefined
    try {
      const user = await payload.create({
        collection: 'users',
        data: {
          email: `member-${suffix}@student.mahidol.ac.th`,
          password: randomUUID(),
          roles: ['visitor'],
          student_email_verified: true,
        },
        context: { isOAuthFlow: true },
      })
      userId = user.id
      expect(user.roles).toEqual(['visitor'])
      expect(user.student_email_verified).toBe(true)

      const promoted = await payload.update({
        collection: 'users',
        id: user.id,
        data: {
          name_thai: { first_name: 'สม', last_name: 'ใจ' },
          academic: { student_id: '1234567', year: year.id },
        },
      })
      expect(getMissingProfileFields(promoted as unknown as Record<string, unknown>)).toEqual([])
      expect(promoted.roles).toEqual(['member'])
    } finally {
      if (userId) await payload.delete({ collection: 'users', id: userId })
      await payload.delete({ collection: 'tags', id: year.id })
    }
  },
  15_000,
)
