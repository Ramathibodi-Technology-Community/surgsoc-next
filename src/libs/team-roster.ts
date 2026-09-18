import { tagId, tagLabel, tagOrder, type TagRef } from './tags'

export type TeamUser = {
  name_english?: { first_name?: string; last_name?: string }
  name_thai?: { first_name?: string; last_name?: string }
  image_url?: string
  nickname?: string
  department?: TagRef
}

export type TeamMemberDoc = {
  id: string | number
  position?: string
  sort_order?: number
  academic_year?: string | number
  is_current?: boolean
  user?: TeamUser | string | number | null
}

export function getTeamMemberUser(member: TeamMemberDoc): TeamUser | null {
  return member.user && typeof member.user === 'object' ? member.user : null
}

/** Sorts "2567", "AY 2024", "2024-25" newest-first off the first 4-digit run. */
export function yearSortValue(year: string): number {
  return Number(year.match(/\d{4}/)?.[0] ?? year) || 0
}

export function groupByYear(members: TeamMemberDoc[]): { years: string[]; byYear: Map<string, TeamMemberDoc[]> } {
  const byYear = new Map<string, TeamMemberDoc[]>()
  for (const member of members) {
    const year = String(member.academic_year || 'Undated')
    if (!byYear.has(year)) byYear.set(year, [])
    byYear.get(year)!.push(member)
  }
  const years = [...byYear.keys()].sort((a, b) => yearSortValue(b) - yearSortValue(a))
  return { years, byYear }
}

export type DepartmentGroup = {
  key: string
  /** Null for members with no department — the caller supplies that heading. */
  label: string | null
  order: number
  members: TeamMemberDoc[]
}

export type YearRoster = {
  leadership: TeamMemberDoc[]
  departments: DepartmentGroup[]
}

/**
 * Leadership is sort_order 1–2 by convention; everyone else groups by the
 * department tag on their linked user record. Same split for every year, so a
 * past roster reads exactly like the current one.
 *
 * Section order comes from the tag's own `sort_order` rather than a hardcoded
 * key list, so reordering the page is an admin edit. Unfiled members trail, as
 * "other" always did.
 */
export function buildYearRoster(members: TeamMemberDoc[], locale?: string): YearRoster {
  const leadership: TeamMemberDoc[] = []
  const byDepartment = new Map<string, DepartmentGroup>()

  for (const member of members) {
    if (member.sort_order !== undefined && member.sort_order < 3) {
      leadership.push(member)
      continue
    }

    const department = getTeamMemberUser(member)?.department
    const id = tagId(department)
    const key = id === null ? 'other' : String(id)

    if (!byDepartment.has(key)) {
      byDepartment.set(key, {
        key,
        label: id === null ? null : tagLabel(department, locale),
        order: id === null ? Number.MAX_SAFE_INTEGER : tagOrder(department),
        members: [],
      })
    }
    byDepartment.get(key)!.members.push(member)
  }

  const departments = [...byDepartment.values()].sort(
    (a, b) => a.order - b.order || (a.label ?? '').localeCompare(b.label ?? ''),
  )

  return { leadership, departments }
}
