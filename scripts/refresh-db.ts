#!/usr/bin/env node
// @ts-nocheck — payload-types.ts may be stale; regenerate via `pnpm run generate:types`

/**
 * Database Refresh Script
 * Resets all data and re-seeds in a single command.
 * Shares a single Payload instance — no subprocess needed.
 *
 * Usage: pnpm run db:refresh
 */

import { assertLocalDatabase, getPayloadInstance } from './shared.js'
import { seedDatabase } from './seed-db.js'

// Collections in reverse-dependency order
const COLLECTIONS_TO_RESET = [
  'form-submissions',
  'form-assignments',
  'forms',
  'feature-requests',
  'registrations',
  'team-members',
  'events',
  'users',
  'groups',
  'attendings',
  // Last: events, users, attendings and groups all point at tags.
  'tags',
] as const

async function refreshDatabase() {
  assertLocalDatabase('db:refresh')

  console.log('🔄 Refreshing database (reset + seed)...\n')
  const payload = await getPayloadInstance()

  // ── Step 1: Reset ──────────────────────────────────
  console.log('🗑️  Clearing all data...')
  for (const slug of COLLECTIONS_TO_RESET) {
    try {
      await payload.delete({
        collection: slug,
        where: { id: { exists: true } },
        overrideAccess: true,
      })
    } catch {
      // Collection might not exist yet, skip
    }
  }
  console.log('   ✅ All collections cleared\n')

  // ── Step 2: Seed (in-process, shares the same Payload instance) ──
  await seedDatabase(payload)

  process.exit(0)
}

refreshDatabase().catch((err) => {
  console.error('❌ Unhandled error:', err)
  process.exit(1)
})
