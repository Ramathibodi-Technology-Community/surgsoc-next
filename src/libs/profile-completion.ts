import type { User } from '@/payload-types'

const REQUIRED_PROFILE_FIELDS = [
  { path: 'name_thai.first_name', label: 'Thai First Name' },
  { path: 'name_thai.last_name', label: 'Thai Last Name' },
  { path: 'academic.student_id', label: 'Student ID' },
] as const

function getFieldValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>(
    (current, key) =>
      current != null && typeof current === 'object'
        ? (current as Record<string, unknown>)[key]
        : undefined,
    obj,
  )
}

function isFieldFilled(value: unknown): boolean {
  if (value == null || value === '') return false
  if (typeof value === 'string' && value.startsWith('TEMP_')) return false
  return true
}

/**
 * Labels of the required fields still blank. Takes a plain record so it works
 * on both a saved `User` and the raw `data` a beforeChange hook receives —
 * they are the same shape as far as these three paths are concerned.
 */
export function getMissingProfileFields(data: Record<string, unknown>): string[] {
  return REQUIRED_PROFILE_FIELDS.filter(
    ({ path }) => !isFieldFilled(getFieldValue(data, path)),
  ).map(({ label }) => label)
}

export function isProfileComplete(user: User | null | undefined): boolean {
  if (!user) return false
  return getMissingProfileFields(user as unknown as Record<string, unknown>).length === 0
}
