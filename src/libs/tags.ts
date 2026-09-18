/**
 * Read helpers for the `tags` vocabulary.
 *
 * A relationship field arrives as either a populated object or a bare id,
 * depending on the query's depth. Every render site would otherwise repeat the
 * same `typeof x === 'object'` dance — the exact drift that `specialtyLabel`
 * and the attendings page already had before they shared a list.
 *
 * Structural types rather than the generated `Tag` so these stay unit-testable
 * without loading the Payload config, matching `libs/team-roster.ts`.
 */

import type { Payload, Where } from 'payload'

export type TagLike = {
  id: number | string
  kind?: string | null
  label?: string | null
  label_th?: string | null
  slug?: string | null
  sort_order?: number | null
  active?: boolean | null
  parent?: TagRef
}

export type TagRef = TagLike | number | string | null | undefined

/** The populated tag, or null when the field holds a bare id or nothing. */
export function tagDoc(ref: TagRef): TagLike | null {
  return ref && typeof ref === 'object' ? (ref as TagLike) : null
}

/** The tag's id whether the field is populated or not. */
export function tagId(ref: TagRef): number | null {
  if (ref == null) return null
  if (typeof ref === 'object') return Number(ref.id)
  const n = Number(ref)
  return Number.isFinite(n) ? n : null
}

/** The stable code, or null when the field was not populated. */
export function tagSlug(ref: TagRef): string | null {
  return tagDoc(ref)?.slug ?? null
}

/**
 * Display label for the locale, falling back to English when no Thai label was
 * entered — a half-translated vocabulary should read as English, not as blank.
 */
export function tagLabel(ref: TagRef, locale?: string): string | null {
  const tag = tagDoc(ref)
  if (!tag) return null
  const preferred = locale === 'th' ? tag.label_th : tag.label
  const value = preferred?.trim() || tag.label?.trim() || tag.label_th?.trim()
  return value || null
}

/** Sort index; unpopulated or unordered tags sort last rather than first. */
export function tagOrder(ref: TagRef): number {
  const order = tagDoc(ref)?.sort_order
  return typeof order === 'number' ? order : Number.MAX_SAFE_INTEGER
}

/**
 * The full label chain, outermost first: "Ramathibodi Hospital, Building 1".
 *
 * ponytail: renders only the levels the query actually populated. Payload's
 * default depth of 2 covers one parent hop from an owning document, which is
 * what Locations need. Deeper chains render from the deepest populated level
 * down — pass a higher `depth` to the query if you start nesting three levels.
 */
export function tagPath(ref: TagRef, locale?: string): string {
  const parts: string[] = []
  let current = tagDoc(ref)
  const seen = new Set<string | number>()

  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    const label = tagLabel(current, locale)
    if (label) parts.unshift(label)
    current = tagDoc(current.parent)
  }

  return parts.join(', ')
}

/** The outermost ancestor's label — a location's campus. */
export function tagRootLabel(ref: TagRef, locale?: string): string | null {
  let current = tagDoc(ref)
  let outermost: TagLike | null = null
  const seen = new Set<string | number>()

  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    outermost = current
    current = tagDoc(current.parent)
  }

  // Walking off the end and stopping on a cycle both leave `outermost` holding
  // the last tag reached, which is the same one `tagPath` puts first.
  return outermost ? tagLabel(outermost, locale) : null
}

/**
 * Active tags of one kind, in display order.
 *
 * Retired tags are excluded here but never hidden on records that already hold
 * them — `tagLabel` reads whatever is stored. Retiring a specialty must not
 * blank out the physicians filed under it.
 */
export async function findTags(payload: Payload, kind: string): Promise<TagLike[]> {
  const { docs } = await payload.find({
    collection: 'tags',
    where: { and: [{ kind: { equals: kind } }, { active: { not_equals: false } }] },
    sort: 'sort_order',
    limit: 200,
    depth: 1,
    overrideAccess: true,
  })
  return docs as TagLike[]
}

/**
 * `filterOptions` for a relationship that points at one vocabulary.
 *
 * Runs server-side on the relationship query, so it constrains the REST API
 * too — not just the admin dropdown. Retired tags are hidden from the picker
 * while records already holding them keep rendering.
 */
export const tagsOfKind = (kind: string): Where => ({
  and: [{ kind: { equals: kind } }, { active: { not_equals: false } }],
})

/** Returns a tag id, `undefined` for a blank cell, or `null` for "no such tag". */
export type TagLookup = (raw: unknown) => number | null | undefined

/**
 * Lookup for a column that points at the `tags` vocabulary.
 *
 * Keyed three ways so files written before the migration keep importing: the
 * tag's slug ("type-workshop-observe"), the slug without its kind prefix
 * ("workshop-observe"), and its label ("Workshop (Observe)"). All three are
 * compared with case and punctuation stripped, which is what makes the old
 * enum values — `workshop_observe`, `IA`, `Year_1` — land on the right row.
 * A bare numeric id works too.
 */
export function buildTagLookup(tags: { id: number | string; slug?: string | null; label?: string | null }[]): TagLookup {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')
  const lookup = new Map<string, number>()

  for (const tag of tags) {
    const id = Number(tag.id)
    const slug = String(tag.slug ?? '')
    const candidates = [String(id), slug, slug.replace(/^[^-]+-/, ''), String(tag.label ?? '')]
    for (const candidate of candidates) {
      const key = normalize(candidate)
      if (key) lookup.set(key, id)
    }
  }

  return (raw: unknown) => {
    if (raw === undefined || raw === null) return undefined
    const text = String(raw).trim()
    if (!text) return undefined
    return lookup.get(normalize(text)) ?? null
  }
}
