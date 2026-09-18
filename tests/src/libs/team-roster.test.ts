import { describe, expect, it } from 'vitest'
import { buildYearRoster, groupByYear, yearSortValue } from '@/libs/team-roster'
import type { TagRef } from '@/libs/tags'

/**
 * The roster used to order its department sections from a hardcoded key list
 * and label them from a locked i18n file. Both now come off the department tag,
 * so ordering is an admin edit — these pin the behaviour that change has to
 * preserve.
 */
const member = (sort_order: number, department?: TagRef) => ({
  id: `${sort_order}-${JSON.stringify(department)}`,
  sort_order,
  user: { name_english: { first_name: 'A' }, department },
})

const ia = { id: 1, label: 'Internal Affairs', label_th: 'ฝ่ายกิจการภายใน', sort_order: 0 }
const pr = { id: 2, label: 'Public Relations', sort_order: 5 }

describe('buildYearRoster', () => {
  it('lifts sort_order 1–2 into leadership', () => {
    const roster = buildYearRoster([member(1, ia), member(2, pr), member(5, ia)])
    expect(roster.leadership).toHaveLength(2)
    expect(roster.departments).toHaveLength(1)
  })

  it('orders sections by the tag sort_order, not by name or count', () => {
    const roster = buildYearRoster([member(5, pr), member(6, ia), member(7, ia)])
    expect(roster.departments.map((d) => d.label)).toEqual(['Internal Affairs', 'Public Relations'])
  })

  it('trails members with no department instead of dropping them', () => {
    const roster = buildYearRoster([member(5, pr), member(6, undefined)])
    expect(roster.departments.map((d) => d.key)).toEqual(['2', 'other'])
    // Null label, so the page supplies its own translated "Other" heading.
    expect(roster.departments.at(-1)!.label).toBeNull()
  })

  it('labels a section in the reader’s locale', () => {
    const roster = buildYearRoster([member(5, ia)], 'th')
    expect(roster.departments[0].label).toBe('ฝ่ายกิจการภายใน')
  })

  it('falls back to English where a section has no Thai label', () => {
    const roster = buildYearRoster([member(5, pr)], 'th')
    expect(roster.departments[0].label).toBe('Public Relations')
  })
})

describe('groupByYear', () => {
  it('sorts years newest first off the first four-digit run', () => {
    const { years } = groupByYear([
      { id: 'a', academic_year: 'AY 2024' },
      { id: 'b', academic_year: '2026-27' },
      { id: 'c', academic_year: '2567' },
    ])
    expect(years).toEqual(['2567', '2026-27', 'AY 2024'])
    expect(yearSortValue('AY 2024')).toBe(2024)
  })
})
