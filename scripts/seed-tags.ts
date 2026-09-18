#!/usr/bin/env node
// @ts-nocheck — payload-types.ts may be stale; regenerate via `pnpm run generate:types`

/**
 * Seeds the shared `tags` vocabulary.
 *
 * Idempotent — upserts on `slug`, the same natural key the registrations
 * importer uses. Safe to re-run after adding rows below.
 *
 * The one-time migration carries its own frozen copy of this list, because a
 * migration must not import code that keeps moving. This file is the live
 * desired state for fresh installs and for `db:refresh`; the migration is
 * history. If you add a vocabulary entry, add it here — existing databases get
 * it on the next seed, not by editing a shipped migration.
 *
 * Usage: pnpm run db:seed:tags
 */

import { getPayloadInstance } from './shared.js'

const EVENT_TYPES = [
  ['type-special-lecture', 'Special Lecture'],
  ['type-conference', 'Conference'],
  ['type-workshop-observe', 'Workshop (Observe)'],
  ['type-workshop-assistant', 'Workshop (Assistant)'],
  ['type-workshop-full', 'Workshop (Full)'],
  ['type-exchange', 'Exchange'],
  ['type-volunteer', 'Volunteer'],
  // Events.ts called this "Social Event"; libs/fields/interests.ts called the
  // same value "Event". They had already drifted. Events.ts wins — it is the
  // label an organiser picked from when filing the event.
  ['type-event', 'Social Event'],
  ['type-inspirational', 'Inspirational'],
]

// The divisions of Ramathibodi's Department of Surgery, in the department's
// own order. The previous list was a generic textbook set — it carried
// Orthopedics, which at Ramathibodi is a separate department, and split
// Trauma, Vascular and Transplant into rows the faculty does not use.
const SPECIALTIES = [
  ['spec-gi-general', 'Gastrointestinal and General Surgery', 'ศัลยศาสตร์ทางเดินอาหารและศัลยศาสตร์ทั่วไป'],
  ['spec-hpb', 'Hepatobiliary and Pancreatic Surgery', 'ศัลยศาสตร์ตับ ตับอ่อน และทางเดินน้ำดี'],
  ['spec-breast-endocrine', 'Breast and Endocrine Surgery', 'ศัลยศาสตร์เต้านมและต่อมไร้ท่อ'],
  ['spec-vascular-transplant', 'Vascular Surgery and Transplantation', 'ศัลยศาสตร์หลอดเลือดและปลูกถ่ายอวัยวะ'],
  ['spec-trauma-critical-care', 'Trauma, Emergency and Critical Care Surgery', 'ศัลยศาสตร์อุบัติเหตุ เวชบำบัดฉุกเฉินและเวชบำบัดวิกฤต'],
  ['spec-plastic', 'Plastic and Maxillofacial Surgery', 'ศัลยศาสตร์ตกแต่งและแม็กซิโลเฟเชียล'],
  ['spec-neurosurgery', 'Neurosurgery', 'ประสาทศัลยศาสตร์'],
  ['spec-urology', 'Urology', 'ศัลยศาสตร์ระบบปัสสาวะ'],
  ['spec-pediatric', 'Pediatric Surgery', 'กุมารศัลยศาสตร์'],
  ['spec-cardiothoracic', 'Cardiothoracic Surgery', 'ศัลยศาสตร์ทรวงอก'],
]

// Slugs match the existing `groups` slugs on purpose — that is what lets
// `groups.tag` be backfilled with a plain slug join instead of a mapping table.
//
// The Thai labels came out of src/i18n/locales/th/team.json, where they were
// the only translated copy of this list and could only be changed by a deploy.
const DEPARTMENTS = [
  ['dept-ia', 'Internal Affairs', 'ฝ่ายกิจการภายใน'],
  ['dept-ea', 'External Affairs', 'ฝ่ายกิจการภายนอก'],
  ['dept-od', 'Organizational Development', 'ฝ่ายพัฒนาองค์กร'],
  ['dept-pr', 'Public Relations', 'ฝ่ายประชาสัมพันธ์'],
]

// Gap Year last: it is the interruption, not the year after Year 6.
const YEARS = [
  ['year-1', 'Year 1'],
  ['year-2', 'Year 2'],
  ['year-3', 'Year 3'],
  ['year-4', 'Year 4'],
  ['year-5', 'Year 5'],
  ['year-6', 'Year 6'],
  ['year-gap', 'Gap Year'],
]

const TRACKS = [
  ['track-md', 'M.D.'],
  ['track-md-meng', 'M.D.-M.Eng.'],
  ['track-md-mm', 'M.D.-M.M.'],
  ['track-md-msc', 'M.D.-M.Sc.'],
  ['track-rak', 'RAK'],
]

/*
  [slug, English, Thai]

  Gendered in Thai because Thai academic titles are: รศ.นพ. for a man, รศ.พญ.
  for a woman. English has no equivalent distinction, so each pair shares an
  English label and is told apart by its slug.

  ponytail: that makes the admin picker show two identical options per rank
  (male first, female second, by sort_order). Fine for a list this stable; if
  it starts causing mis-picks, give Tags a `display` virtual that appends
  `label_th` and point `useAsTitle` at it — which would improve every other
  bilingual picker at the same time.
*/
const ACADEMIC_TITLES = [
  ['title-prof-m', 'Prof. Dr.', 'ศ.นพ.'],
  ['title-prof-f', 'Prof. Dr.', 'ศ.พญ.'],
  ['title-assoc-prof-m', 'Assoc. Prof. Dr.', 'รศ.นพ.'],
  ['title-assoc-prof-f', 'Assoc. Prof. Dr.', 'รศ.พญ.'],
  ['title-asst-prof-m', 'Asst. Prof. Dr.', 'ผศ.นพ.'],
  ['title-asst-prof-f', 'Asst. Prof. Dr.', 'ผศ.พญ.'],
  ['title-lecturer-m', 'Dr.', 'อ.นพ.'],
  ['title-lecturer-f', 'Dr.', 'อ.พญ.'],
]

// Two campuses plus Online. A campus is the parent row; venues nest under it,
// so the campus can only be spelt one way no matter how many rooms are added.
const CAMPUSES = [
  ['loc-pyt', 'Ramathibodi Hospital (Phayathai)', 'โรงพยาบาลรามาธิบดี (พญาไท)'],
  ['loc-cnmi', 'Chakri Naruebodindra Medical Institute', 'สถาบันการแพทย์จักรีนฤบดินทร์'],
  ['loc-online', 'Online', 'ออนไลน์'],
]

/*
  [campus slug, venue slug, English, Thai]

  Real buildings, taken from each campus's published listings rather than
  invented — a venue nobody can find is worse than no venue at all. Thai is
  left blank where no authoritative spelling was found; an editor fills it in
  and the seed will not overwrite it.

  Not exhaustive, and not meant to be. This is the collection whose whole point
  is "add a row to add an option" — rooms belong in the admin panel, not here.
*/
const VENUES = [
  ['loc-pyt', 'loc-pyt-learning', 'Medical Education and Ramathibodi School of Nursing Building', 'อาคารเรียนและปฏิบัติการรวมด้านการแพทย์และโรงเรียนพยาบาลรามาธิบดี'],
  ['loc-pyt', 'loc-pyt-sdmc', 'Somdech Phra Debaratana Medical Center', 'อาคารสมเด็จพระเทพรัตน์'],
  ['loc-pyt', 'loc-pyt-sirikit', 'Sirikit Medical Center', 'ศูนย์การแพทย์สิริกิติ์'],
  ['loc-cnmi', 'loc-cnmi-hospital', 'Ramathibodi Chakri Naruebodindra Hospital', 'โรงพยาบาลรามาธิบดีจักรีนฤบดินทร์'],
  ['loc-cnmi', 'loc-cnmi-learning', 'Queen Sirikit Learning and Research Centre', ''],
  ['loc-cnmi', 'loc-cnmi-recreation', 'Recreation Building', 'อาคารนันทนาการ'],
]

/*
  Slugs this seed used to create and no longer offers.

  Retired, never deleted. `active: false` is exactly the mechanism Tags.ts
  documents: a physician already filed under "General Surgery", or a user whose
  year is the old M.Eng/M.M row, keeps rendering that label — only the pickers
  stop offering it. Deleting instead would either break a foreign key or blank
  out real records to tidy a dropdown.
*/
const RETIRED = [
  // Departments folded away — the society runs four.
  'dept-ad',
  'dept-cc',
  // Specialties replaced by the Department of Surgery's own divisions.
  'spec-general-surgery',
  'spec-orthopedic',
  'spec-vascular',
  'spec-oncology',
  'spec-trauma',
  'spec-transplant',
  'spec-other',
  // Renamed to Gap Year under a slug that says so.
  'year-m-eng-m-m',
  // Ungendered titles, replaced by the นพ./พญ. pairs above.
  'title-prof',
  'title-assoc-prof',
  'title-asst-prof',
  'title-dr',
  // Campus and rooms superseded by loc-pyt and its buildings.
  'loc-ramathibodi',
  'loc-rama-b1-r301',
  'loc-rama-b1-r201',
  'loc-rama-anatomy-hall-a',
]

const VOCABULARY = [
  ...EVENT_TYPES.map(([slug, label], i) => ({ kind: 'event_type', slug, label, sort_order: i })),
  ...SPECIALTIES.map(([slug, label, label_th], i) => ({ kind: 'specialty', slug, label, label_th, sort_order: i })),
  ...DEPARTMENTS.map(([slug, label, label_th], i) => ({ kind: 'department', slug, label, label_th, sort_order: i })),
  ...YEARS.map(([slug, label], i) => ({ kind: 'year', slug, label, sort_order: i })),
  ...TRACKS.map(([slug, label], i) => ({ kind: 'track', slug, label, sort_order: i })),
  ...ACADEMIC_TITLES.map(([slug, label, label_th], i) => ({ kind: 'academic_title', slug, label, label_th, sort_order: i })),
]

/**
 * Upsert on slug. Deliberately does NOT overwrite `label_th` or `active` —
 * those are editor decisions, and a re-seed must not silently un-retire a tag
 * or wipe a translation someone typed in the admin panel.
 */
export async function upsertTag(payload, row) {
  const found = await payload.find({
    collection: 'tags',
    where: { slug: { equals: row.slug } },
    limit: 1,
    overrideAccess: true,
  })

  if (found.docs[0]) {
    await payload.update({
      collection: 'tags',
      id: found.docs[0].id,
      data: {
        kind: row.kind,
        label: row.label,
        sort_order: row.sort_order,
        parent: row.parent,
        // Only fill a blank one. An editor's translation outranks the seed's.
        label_th: found.docs[0].label_th || row.label_th || null,
      },
      overrideAccess: true,
    })
    return found.docs[0].id
  }

  const created = await payload.create({
    collection: 'tags',
    data: { active: true, ...row },
    overrideAccess: true,
  })
  return created.id
}

/** Locations, campuses first so each venue has a parent id to point at. */
async function seedLocations(payload) {
  const campusIds = {}
  for (const [slug, label, label_th] of CAMPUSES) {
    // Online sorts last so the physical campuses lead the dropdown.
    const sort_order = slug === 'loc-online' ? 99 : Object.keys(campusIds).length
    campusIds[slug] = await upsertTag(payload, { kind: 'location', slug, label, label_th, sort_order })
  }

  for (const [campus, slug, label, label_th] of VENUES) {
    await upsertTag(payload, {
      kind: 'location',
      slug,
      label,
      label_th: label_th || undefined,
      parent: campusIds[campus],
      sort_order: VENUES.filter((v) => v[0] === campus).findIndex((v) => v[1] === slug),
    })
  }

  return VENUES.length + CAMPUSES.length
}

/** Hide superseded rows without touching the records that still hold them. */
async function retireTags(payload) {
  let retired = 0
  for (const slug of RETIRED) {
    const { docs } = await payload.find({
      collection: 'tags',
      where: { slug: { equals: slug } },
      limit: 1,
      overrideAccess: true,
    })
    if (!docs[0] || docs[0].active === false) continue
    await payload.update({
      collection: 'tags',
      id: docs[0].id,
      data: { active: false },
      overrideAccess: true,
    })
    retired++
  }
  return retired
}

export async function seedTags(payloadInstance?) {
  const payload = payloadInstance || (await getPayloadInstance())

  console.log('\n🏷  Seeding tag vocabulary...')
  for (const row of VOCABULARY) await upsertTag(payload, row)
  const locations = await seedLocations(payload)
  console.log(`   ✅ ${VOCABULARY.length + locations} tags`)

  const retired = await retireTags(payload)
  if (retired > 0) console.log(`   🗄  ${retired} superseded tags retired`)
}


/** Every tag's id keyed by slug, for seeds that need to reference one. */
export async function tagIdsBySlug(payloadInstance?) {
  const payload = payloadInstance || (await getPayloadInstance())
  const { docs } = await payload.find({
    collection: 'tags',
    limit: 500,
    depth: 0,
    overrideAccess: true,
  })
  return Object.fromEntries(docs.map((tag) => [tag.slug, tag.id]))
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedTags()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Unhandled error:', err)
      process.exit(1)
    })
}
