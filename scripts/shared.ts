#!/usr/bin/env node

/**
 * Shared utilities for database scripts.
 * Provides a connected Payload instance for seed/reset scripts.
 */

import path from 'path'
import { randomBytes } from 'crypto'
import { fileURLToPath } from 'url'

const _dirname = path.dirname(fileURLToPath(import.meta.url))

// Node 22 ships .env parsing; `engines` already pins 22.x. Unlike dotenv it
// throws on a missing file — swallow that, since CI supplies env via the shell.
// `loadEnvFile` never overwrites a var already in process.env, so loading
// highest-precedence first and falling back down mirrors Next.js's own
// .env.$(NODE_ENV).local > .env.local > .env.$(NODE_ENV) > .env order. This
// matters locally: compose.override.yml remaps the Postgres container to a
// different host port in .env.development.local (working around a stray
// system Postgres on the default port), and without this order these scripts
// silently fell back to .env's port instead.
const NODE_ENV = process.env.NODE_ENV || 'development'
for (const file of [`.env.${NODE_ENV}.local`, '.env.local', `.env.${NODE_ENV}`, '.env']) {
  try {
    process.loadEnvFile(path.resolve(_dirname, '../', file))
  } catch {
    // file not on disk; rely on the ambient environment / next file in the chain
  }
}

let _seedPassword: string | undefined

/**
 * The password every seeded account is created with.
 *
 * Seeded users sign in via Google OAuth, so this is never typed by anyone — but
 * Payload's local (email + password) strategy stays enabled, so a *known* value
 * here is a login for every seeded account, superadmin included. It must never
 * be a constant in the repo.
 *
 * Set SEED_PASSWORD to log in as a seeded user locally. Left unset, each run
 * gets one random password that is never printed, so the accounts exist but
 * nobody can authenticate as them with a password.
 */
export function seedPassword(): string {
  if (!_seedPassword) {
    _seedPassword = process.env.SEED_PASSWORD || randomBytes(32).toString('hex')
    if (!process.env.SEED_PASSWORD) {
      console.warn('⚠️  SEED_PASSWORD unset — seeded accounts get a random password (Google sign-in only).')
    }
  }
  return _seedPassword
}

let _seedAdminEmail: string | undefined

/**
 * The email address seeded as the superadmin account.
 *
 * Unlike `seedPassword()`, there is no safe fallback here: this repo is
 * public, so a hardcoded real address would ship a specific person's email
 * — and the resulting account — to every clone. Set SEED_ADMIN_EMAIL before
 * seeding; left unset, this throws immediately rather than silently seeding
 * a placeholder that a superadmin lookup elsewhere would then fail to find.
 */
export function seedAdminEmail(): string {
  if (!_seedAdminEmail) {
    const email = process.env.SEED_ADMIN_EMAIL
    if (!email) {
      throw new Error(
        'SEED_ADMIN_EMAIL is not set. Set it in .env to the address that should become the ' +
          "seeded superadmin account (e.g. SEED_ADMIN_EMAIL=you@example.com) — there's no " +
          'default, since this is a public repo and baking in a real address would ship it to every clone.',
      )
    }
    _seedAdminEmail = email
  }
  return _seedAdminEmail
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0', 'payload-db'])

/**
 * Refuses to run a destructive script against a database that is not obviously
 * local.
 *
 * `db:reset` and `db:refresh` delete every row in every collection, and they
 * target whatever DATABASE_URL happens to resolve to — normally the Docker
 * Postgres from `db:up`, but a prod URL exported in the shell for a one-off
 * query is all it takes for the same command to wipe production. There was no
 * check of any kind before this.
 *
 * Set ALLOW_REMOTE_DB_RESET=1 to override, which is what a deliberate
 * production wipe should have to say out loud.
 */
export function assertLocalDatabase(action: string): void {
  if (process.env.ALLOW_REMOTE_DB_RESET === '1') {
    console.warn(`\n\u26a0\ufe0f  ALLOW_REMOTE_DB_RESET=1 — running ${action} against a REMOTE database.\n`)
    return
  }

  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(`${action} aborted: DATABASE_URL is not set.`)
  }

  let host: string
  try {
    host = new URL(url).hostname
  } catch {
    // An unparseable URL is not something to be optimistic about.
    throw new Error(`${action} aborted: DATABASE_URL could not be parsed.`)
  }

  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `${action} aborted: DATABASE_URL points at "${host}", which is not a local database.\n` +
        `   This script deletes every row in every collection.\n` +
        `   If you really mean to do this, re-run with ALLOW_REMOTE_DB_RESET=1.`,
    )
  }
}

/**
 * Returns a connected Payload instance.
 * Uses dynamic import so the env above is loaded before the config is evaluated.
 */
export async function getPayloadInstance() {
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config')
  return getPayload({ config })
}
