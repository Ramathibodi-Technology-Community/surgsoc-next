#!/usr/bin/env node
// @ts-nocheck — payload-types.ts may be stale; regenerate via `pnpm run generate:types`

/**
 * Seeds just the `groups` collection, standalone. See seedGroups in
 * seed-db.ts for the actual logic; this is only the CLI entry point.
 *
 * Usage: pnpm run db:seed:groups
 */
import { seedGroups } from './seed-db.js'

seedGroups()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Unhandled error:', err)
    process.exit(1)
  })
