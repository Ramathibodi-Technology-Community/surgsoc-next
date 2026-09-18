import { expect, test } from 'vitest'

test.skipIf(process.env.RUN_DATABASE_TESTS !== '1')(
  'concurrent applications leave one registration and one canonical submission',
  async () => {
    const [{ getPayload }, { default: config }] = await Promise.all([
      import('payload'),
      import('@/payload.config'),
    ])
    const payload = await getPayload({ config })
    const pool = payload.db.pool
    const fixture = await pool.query<{
      event_id: number
      form_id: number
      user_id: number
    }>(`
      SELECT e.id AS event_id, e.subscription_form_id AS form_id, u.id AS user_id
      FROM events e
      CROSS JOIN users u
      WHERE e.subscription_form_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM registrations r
          WHERE r.event_id = e.id AND r.user_id = u.id
        )
      LIMIT 1
    `)

    expect(fixture.rows[0], 'seed at least one event with a registration form and one user').toBeDefined()
    const { event_id, form_id, user_id } = fixture.rows[0]

    const apply = async () => {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const submission = await client.query<{ id: number }>(
          `INSERT INTO form_submissions (form_id, user_id, updated_at, created_at)
           VALUES ($1, $2, now(), now()) RETURNING id`,
          [form_id, user_id],
        )
        await client.query(
          `INSERT INTO registrations
             (event_id, user_id, status, submission_id, updated_at, created_at)
           VALUES ($1, $2, 'applicant', $3, now(), now())`,
          [event_id, user_id, submission.rows[0].id],
        )
        await client.query('COMMIT')
        return submission.rows[0].id
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    }

    let createdSubmissionId: number | undefined
    try {
      const results = await Promise.allSettled([apply(), apply()])
      const successes = results.filter(
        (result): result is PromiseFulfilledResult<number> => result.status === 'fulfilled',
      )
      createdSubmissionId = successes[0]?.value

      expect(successes).toHaveLength(1)
      expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(1)

      const registrations = await pool.query<{ submission_id: number }>(
        'SELECT submission_id FROM registrations WHERE event_id = $1 AND user_id = $2',
        [event_id, user_id],
      )
      const submissions = await pool.query<{ id: number }>(
        'SELECT id FROM form_submissions WHERE id = $1',
        [createdSubmissionId],
      )

      expect(registrations.rows).toHaveLength(1)
      expect(submissions.rows.map(({ id }) => id)).toEqual([registrations.rows[0].submission_id])
    } finally {
      await pool.query('DELETE FROM registrations WHERE event_id = $1 AND user_id = $2', [event_id, user_id])
      if (createdSubmissionId) {
        await pool.query('DELETE FROM form_submissions WHERE id = $1', [createdSubmissionId])
      }
    }
  },
  15_000,
)
