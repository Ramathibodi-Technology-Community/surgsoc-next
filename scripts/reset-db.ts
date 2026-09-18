#!/usr/bin/env node
// @ts-nocheck — payload-types.ts may be stale; regenerate via `pnpm run generate:types`

/**
 * Database Reset Script
 * Deletes all data from all collections via PayloadCMS Local API.
 *
 * Usage: pnpm run db:reset
 */

import { assertLocalDatabase, getPayloadInstance } from './shared.js'

// Collections in reverse-dependency order (dependents first)
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

async function resetDatabase() {
  assertLocalDatabase('db:reset')

  console.log('🗑️  Resetting database...\n')

  const payload = await getPayloadInstance()

  for (const slug of COLLECTIONS_TO_RESET) {
    try {
      const result = await payload.delete({
        collection: slug,
        where: { id: { exists: true } },
        overrideAccess: true,
      })

      const count = Array.isArray(result.docs) ? result.docs.length : 0
      if (count > 0) {
        console.log(`   🗑️  ${slug}: deleted ${count} docs`)
      } else {
        console.log(`   ℹ️  ${slug}: empty`)
      }
    } catch (err: any) {
      // Collection might not exist yet (fresh DB), skip gracefully
      if (err?.message?.includes('relation') && err?.message?.includes('does not exist')) {
        console.log(`   ⚠️  ${slug}: table not found (skipped)`)
      } else {
        console.log(`   ⚠️  ${slug}: ${err?.message || err}`)
      }
    }
  }

  console.log('\n✅ Database reset complete!')
  process.exit(0)
}

resetDatabase().catch((err) => {
  console.error('❌ Unhandled error:', err)
  process.exit(1)
})
