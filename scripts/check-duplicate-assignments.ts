#!/usr/bin/env node
// Run before the form-assignment-lifecycle migration against a database that
// predates the (form_id, user_id) unique index — the old bulk-assign flow had
// no transaction and no uniqueness constraint, so duplicates are plausible.
import { getPayloadInstance } from './shared.js'

async function main() {
  const payload = await getPayloadInstance()
  const { docs } = await payload.find({
    collection: 'form-assignments',
    limit: 0,
    depth: 0,
    overrideAccess: true,
  })

  const counts = new Map<string, number>()
  for (const doc of docs as any[]) {
    const key = `${doc.form}:${doc.user}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const duplicates = [...counts.entries()].filter(([, count]) => count > 1)
  if (duplicates.length === 0) {
    console.log('✅ No duplicate (form, user) form-assignment pairs found.')
    return
  }

  console.error(`❌ Found ${duplicates.length} duplicate (form, user) pairs — the migration's unique index will fail:`)
  for (const [key, count] of duplicates) {
    console.error(`   ${key} — ${count} rows`)
  }
  process.exit(1)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`❌ duplicate check failed: ${error.message}`)
    process.exit(1)
  })
