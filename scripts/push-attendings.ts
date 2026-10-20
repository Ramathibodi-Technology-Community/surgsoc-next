#!/usr/bin/env node
// @ts-nocheck — payload-types.ts may be stale; regenerate via `pnpm run generate:types`

/**
 * Pushes ONLY the `attendings` collection — no users, events, groups, or the
 * rest of the tag vocabulary. For an environment (prod) where everything else
 * is already seeded and only the advisor roster is missing.
 *
 * Still upserts the one new specialty tag this roster needs
 * (`spec-gen-cnmi`), since `seedAttendings` can't resolve a slug that doesn't
 * exist yet. Every other tag it references must already be present.
 *
 * Usage: pnpm run db:seed:attendings
 */

import { getPayloadInstance } from './shared.js'
import { upsertTag, tagIdsBySlug } from './seed-tags.js'
import { seedAttendings } from './seed-db.js'

async function main() {
  const payload = await getPayloadInstance()

  await upsertTag(payload, {
    kind: 'specialty',
    slug: 'spec-gen-cnmi',
    label: 'General and Colorectal Surgery, CNMI',
    label_th: 'ศัลยศาสตร์ทั่วไปและทางเดินอาหาร สถาบันการแพทย์จักรีนฤบดินทร์',
    sort_order: 2,
  })

  const tag = await tagIdsBySlug(payload)
  await seedAttendings(payload, tag)
}

main()
  .then(() => {
    console.log('\n✅ Attendings pushed.')
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
