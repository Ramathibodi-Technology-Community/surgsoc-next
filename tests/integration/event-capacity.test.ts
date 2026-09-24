import { randomUUID } from 'node:crypto'
import { expect, test } from 'vitest'

test.skipIf(process.env.RUN_DATABASE_TESTS !== '1')(
  'concurrent automatic acceptances cannot exceed event capacity',
  async () => {
    const [{ getPayload }, { default: config }] = await Promise.all([
      import('payload'),
      import('@/payload.config'),
    ])
    const payload = await getPayload({ config })
    const pool = payload.db.pool
    const suffix = randomUUID()
    const tag = await pool.query<{ id: number }>(
      `INSERT INTO tags (kind, label, slug) VALUES ('event_type', 'Capacity test', $1) RETURNING id`,
      [`capacity-${suffix}`],
    )
    const tagId = tag.rows[0].id
    let eventId: number | undefined
    let userIds: number[] = []

    try {
      const event = await pool.query<{ id: number }>(
        `INSERT INTO events (name, event_type_id, date_begin, participant_limit)
         VALUES ('Capacity test', $1, now() + interval '1 day', 1) RETURNING id`,
        [tagId],
      )
      eventId = event.rows[0].id
      const users = await pool.query<{ id: number }>(
        `INSERT INTO users (email) VALUES ($1), ($2) RETURNING id`,
        [`capacity-a-${suffix}@example.com`, `capacity-b-${suffix}@example.com`],
      )
      userIds = users.rows.map(({ id }) => id)

      const apply = async (userId: number) => {
        const client = await pool.connect()
        try {
          await client.query('BEGIN')
          await client.query(
            `INSERT INTO registrations (event_id, user_id, status)
             VALUES ($1, $2, 'accepted')`,
            [eventId, userId],
          )
          await client.query('COMMIT')
        } catch (error) {
          await client.query('ROLLBACK')
          throw error
        } finally {
          client.release()
        }
      }

      const results = await Promise.allSettled(userIds.map(apply))
      expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1)
      expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(1)
      const occupied = await pool.query<{ count: string }>(
        `SELECT count(*) FROM registrations WHERE event_id = $1 AND status = 'accepted'`,
        [eventId],
      )
      expect(Number(occupied.rows[0].count)).toBe(1)
    } finally {
      if (eventId) await pool.query('DELETE FROM registrations WHERE event_id = $1', [eventId])
      if (eventId) await pool.query('DELETE FROM events WHERE id = $1', [eventId])
      if (userIds.length) await pool.query('DELETE FROM users WHERE id = ANY($1::int[])', [userIds])
      await pool.query('DELETE FROM tags WHERE id = $1', [tagId])
    }
  },
  15_000,
)
