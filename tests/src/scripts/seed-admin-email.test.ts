import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/*
  This repo is public, so the seeded superadmin address must never be a
  constant in the source — see seedPassword()'s doc comment for the sibling
  case. seedAdminEmail() throws instead of falling back, so the fail-closed
  case matters more than the happy path.
*/
describe('seedAdminEmail', () => {
  const originalEmail = process.env.SEED_ADMIN_EMAIL

  beforeEach(() => {
    vi.resetModules()
    delete process.env.SEED_ADMIN_EMAIL
  })

  afterEach(() => {
    if (originalEmail === undefined) delete process.env.SEED_ADMIN_EMAIL
    else process.env.SEED_ADMIN_EMAIL = originalEmail
  })

  /*
    Importing the module is what loads .env (shared.ts calls
    process.loadEnvFile at module scope), so the env has to be cleared AFTER
    the import, not before it — clearing first just gets undone by the import.
    Written the other way this test passes or fails depending on whether the
    developer running it happens to have SEED_ADMIN_EMAIL in their own .env.
  */
  it('throws when SEED_ADMIN_EMAIL is unset', async () => {
    const { seedAdminEmail } = await import('../../../scripts/shared')
    delete process.env.SEED_ADMIN_EMAIL
    expect(() => seedAdminEmail()).toThrow(/SEED_ADMIN_EMAIL/)
  })

  it('returns the configured value when set', async () => {
    const { seedAdminEmail } = await import('../../../scripts/shared')
    process.env.SEED_ADMIN_EMAIL = 'admin@example.test'
    expect(seedAdminEmail()).toBe('admin@example.test')
  })
})
