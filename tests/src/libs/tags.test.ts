import { describe, expect, it } from 'vitest'
import {
  tagDoc,
  tagId,
  tagLabel,
  tagOrder,
  tagPath,
  tagRootLabel,
  tagSlug,
} from '@/libs/tags'

/**
 * Relationship fields arrive either populated or as a bare id depending on the
 * query's depth, and every render site reads them. These pin the two shapes
 * apart: an unpopulated field must degrade to null rather than render an id at
 * a reader, and a populated one must survive the locale fallback.
 */
const campus = { id: 1, kind: 'location', label: 'Ramathibodi Hospital', slug: 'loc-rama', sort_order: 0 }
const room = { id: 2, kind: 'location', label: 'Building 1, Room 301', slug: 'loc-b1-301', parent: campus, sort_order: 3 }

describe('tag readers', () => {
  it('reads an id whether the field is populated or not', () => {
    expect(tagId(room)).toBe(2)
    expect(tagId(7)).toBe(7)
    expect(tagId('7')).toBe(7)
    expect(tagId(null)).toBeNull()
    expect(tagId(undefined)).toBeNull()
  })

  it('returns null for anything only the database could answer', () => {
    // Depth 0 leaves a bare id. Rendering "2" where a label belongs is worse
    // than rendering nothing, so these refuse rather than guess.
    expect(tagDoc(2)).toBeNull()
    expect(tagSlug(2)).toBeNull()
    expect(tagLabel(2)).toBeNull()
  })

  it('falls back to English when a Thai label was never entered', () => {
    const withThai = { id: 3, label: 'Internal Affairs', label_th: 'ฝ่ายกิจการภายใน' }
    const withoutThai = { id: 4, label: 'Urology' }

    expect(tagLabel(withThai, 'th')).toBe('ฝ่ายกิจการภายใน')
    expect(tagLabel(withThai, 'en')).toBe('Internal Affairs')
    // A half-translated vocabulary reads as English, never as blank.
    expect(tagLabel(withoutThai, 'th')).toBe('Urology')
  })

  it('treats a whitespace-only label as absent', () => {
    expect(tagLabel({ id: 5, label: 'Urology', label_th: '   ' }, 'th')).toBe('Urology')
    expect(tagLabel({ id: 6, label: '  ' })).toBeNull()
  })

  it('sorts unordered and unpopulated tags last, not first', () => {
    expect(tagOrder(room)).toBe(3)
    expect(tagOrder({ id: 8 })).toBe(Number.MAX_SAFE_INTEGER)
    expect(tagOrder(8)).toBe(Number.MAX_SAFE_INTEGER)
  })

  it('renders a parent chain outermost first', () => {
    expect(tagPath(room)).toBe('Ramathibodi Hospital, Building 1, Room 301')
    expect(tagRootLabel(room)).toBe('Ramathibodi Hospital')
  })

  it('renders only what the query populated', () => {
    // Depth cut the chain: the parent is a bare id. The venue still renders.
    expect(tagPath({ id: 2, label: 'Building 1, Room 301', parent: 1 })).toBe('Building 1, Room 301')
  })

  it('treats a flat location as its own campus', () => {
    const online = { id: 9, label: 'Online' }
    expect(tagPath(online)).toBe('Online')
    expect(tagRootLabel(online)).toBe('Online')
  })

  it('does not hang on a cycle', () => {
    // Nothing should be able to create one — `filterOptions` excludes self and
    // other kinds — but a render path that loops forever takes the page down,
    // so the walk is bounded by what it has already seen.
    const a: any = { id: 10, label: 'A' }
    const b: any = { id: 11, label: 'B', parent: a }
    a.parent = b

    expect(tagPath(b)).toBe('A, B')
    expect(tagRootLabel(b)).toBe('A')
  })
})
