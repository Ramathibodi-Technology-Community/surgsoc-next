import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assertLocalDatabase } from '../../../scripts/shared'

/*
  `db:reset` and `db:refresh` delete every row in every collection and target
  whatever DATABASE_URL resolves to. The guard is the only thing standing
  between a stale prod URL in someone's shell and an emptied production
  database, so the fail-closed cases matter more than the happy path.
*/
describe('assertLocalDatabase', () => {
  const originalUrl = process.env.DATABASE_URL
  const originalOverride = process.env.ALLOW_REMOTE_DB_RESET

  beforeEach(() => {
    delete process.env.ALLOW_REMOTE_DB_RESET
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    process.env.DATABASE_URL = originalUrl
    if (originalOverride === undefined) delete process.env.ALLOW_REMOTE_DB_RESET
    else process.env.ALLOW_REMOTE_DB_RESET = originalOverride
    vi.restoreAllMocks()
  })

  it.each([
    ['postgres://u:p@localhost:5432/db', 'localhost'],
    ['postgres://u:p@127.0.0.1:5432/db', '127.0.0.1'],
    ['postgres://u:p@payload-db:5432/db', 'the docker compose service'],
  ])('allows %s (%s)', (url) => {
    process.env.DATABASE_URL = url
    expect(() => assertLocalDatabase('db:reset')).not.toThrow()
  })

  it('refuses a remote host', () => {
    process.env.DATABASE_URL = 'postgres://u:p@db.prod.example.com:5432/surgsoc'
    expect(() => assertLocalDatabase('db:reset')).toThrow(/not a local database/)
  })

  it('names the action and the offending host so the message is actionable', () => {
    process.env.DATABASE_URL = 'postgres://u:p@db.prod.example.com:5432/surgsoc'
    expect(() => assertLocalDatabase('db:refresh')).toThrow(/db:refresh/)
    expect(() => assertLocalDatabase('db:refresh')).toThrow(/db\.prod\.example\.com/)
  })

  it('refuses when DATABASE_URL is unset', () => {
    delete process.env.DATABASE_URL
    expect(() => assertLocalDatabase('db:reset')).toThrow(/not set/)
  })

  it('refuses an unparseable DATABASE_URL rather than assuming it is local', () => {
    process.env.DATABASE_URL = 'not a url'
    expect(() => assertLocalDatabase('db:reset')).toThrow(/could not be parsed/)
  })

  it('allows a remote host only with the explicit override', () => {
    process.env.DATABASE_URL = 'postgres://u:p@db.prod.example.com:5432/surgsoc'
    process.env.ALLOW_REMOTE_DB_RESET = '1'
    expect(() => assertLocalDatabase('db:reset')).not.toThrow()
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('REMOTE'))
  })

  it('treats any override value other than "1" as not set', () => {
    process.env.DATABASE_URL = 'postgres://u:p@db.prod.example.com:5432/surgsoc'
    process.env.ALLOW_REMOTE_DB_RESET = 'true'
    expect(() => assertLocalDatabase('db:reset')).toThrow(/not a local database/)
  })
})
