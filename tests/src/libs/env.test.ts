import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { assertAppEnv } from '@/libs/env'

const ok = {
  PAYLOAD_SECRET: 'real-secret',
  DATABASE_URL: 'postgres://localhost:5432/db',
  NEXT_PUBLIC_SERVER_URL: 'http://localhost:3000',
  GOOGLE_CLIENT_ID: 'id',
  GOOGLE_CLIENT_SECRET: 'secret',
  RESEND_API_KEY: 'rk',
  EMAIL_FROM: 'a@b.test',
  NODE_ENV: 'development',
} as NodeJS.ProcessEnv

describe('assertAppEnv', () => {
  beforeEach(() => vi.spyOn(console, 'warn').mockImplementation(() => {}))
  afterEach(() => vi.restoreAllMocks())

  it('returns PAYLOAD_SECRET when every required value is set', () => {
    expect(assertAppEnv({ ...ok })).toBe('real-secret')
  })

  it.each(['PAYLOAD_SECRET', 'DATABASE_URL', 'NEXT_PUBLIC_SERVER_URL', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'])(
    'throws naming %s when it is missing',
    (name) => {
      const env = { ...ok }
      delete env[name]
      expect(() => assertAppEnv(env)).toThrow(name)
    },
  )

  // The whole reason for the placeholder set: an unedited .env.example is
  // "present" to a plain truthiness check, which is how it ships to prod.
  it('rejects an unedited .env.example placeholder', () => {
    expect(() => assertAppEnv({ ...ok, PAYLOAD_SECRET: 'your-super-secret-key-here' })).toThrow(
      /placeholder/,
    )
  })

  it('reports every failure at once, not just the first', () => {
    const env = { ...ok }
    delete env.GOOGLE_CLIENT_ID
    delete env.DATABASE_URL
    expect(() => assertAppEnv(env)).toThrow(/DATABASE_URL[\s\S]*GOOGLE_CLIENT_ID/)
  })

  it('warns, but does not throw, when email env is absent', () => {
    const env = { ...ok }
    delete env.RESEND_API_KEY
    delete env.EMAIL_FROM
    expect(() => assertAppEnv(env)).not.toThrow()
    expect(console.warn).toHaveBeenCalledTimes(2)
  })

  it('refuses SEED_PASSWORD in production only', () => {
    expect(() => assertAppEnv({ ...ok, NODE_ENV: 'production', SEED_PASSWORD: 'p' })).toThrow(
      /SEED_PASSWORD/,
    )
    expect(() => assertAppEnv({ ...ok, NODE_ENV: 'development', SEED_PASSWORD: 'p' })).not.toThrow()
  })
})
