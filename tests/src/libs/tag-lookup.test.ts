import { describe, expect, it } from 'vitest'
import { buildTagLookup } from '@/libs/tags'

/**
 * The importer's tag columns used to be checked against a hardcoded allowlist
 * of enum values. They are rows now, so files an organiser saved before the
 * migration still have to import — and a cell that matches nothing has to fail
 * loudly rather than silently arrive as null.
 */
const TAGS = [
  { id: 3, kind: 'event_type', slug: 'type-workshop-observe', label: 'Workshop (Observe)' },
  { id: 8, kind: 'event_type', slug: 'type-event', label: 'Social Event' },
  { id: 12, kind: 'department', slug: 'dept-ia', label: 'Internal Affairs' },
  { id: 21, kind: 'year', slug: 'year-1', label: 'Year 1' },
]

describe('buildTagLookup', () => {
  const resolve = buildTagLookup(TAGS)

  it('resolves the tag slug', () => {
    expect(resolve('type-workshop-observe')).toBe(3)
    expect(resolve('dept-ia')).toBe(12)
  })

  it('resolves the label', () => {
    expect(resolve('Workshop (Observe)')).toBe(3)
    expect(resolve('Internal Affairs')).toBe(12)
  })

  it('resolves the pre-migration enum values a saved CSV still holds', () => {
    // These are what the columns contained before tags existed.
    expect(resolve('workshop_observe')).toBe(3)
    expect(resolve('IA')).toBe(12)
    expect(resolve('Year_1')).toBe(21)
    // `event` had no shared spelling with its label ("Social Event") — the
    // prefix-stripped slug is what catches it.
    expect(resolve('event')).toBe(8)
  })

  it('resolves a bare numeric id', () => {
    expect(resolve('8')).toBe(8)
    expect(resolve(8)).toBe(8)
  })

  it('ignores case and punctuation', () => {
    expect(resolve('  WORKSHOP OBSERVE  ')).toBe(3)
  })

  it('separates "blank cell" from "no such tag"', () => {
    // undefined means the column was left empty, which is legal for an
    // optional field. null means the organiser typed something wrong, which
    // has to stop the import rather than import a null.
    expect(resolve('')).toBeUndefined()
    expect(resolve('   ')).toBeUndefined()
    expect(resolve(undefined)).toBeUndefined()
    expect(resolve(null)).toBeUndefined()
    expect(resolve('workshop_hologram')).toBeNull()
    expect(resolve('9999')).toBeNull()
  })
})
