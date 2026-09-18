
import type { User, Group } from '@/payload-types'

/*
  The permission keys a group may grant, and the labels the admin checkboxes
  render. One list so the UI cannot drift from the type — `Permission` is
  derived from it rather than declared beside it.

  Anything not listed here is not a permission. `hasPermission` only ever asks
  for these, so a stray key in a group's JSON grants nothing.
*/
export const PERMISSIONS = [
  ['manage_events', 'Manage events'],
  ['manage_forms', 'Manage forms'],
  ['manage_users', 'Manage users'],
  ['view_users', 'View users'],
  ['export_data', 'Export data'],
  ['manage_content', 'Manage content (CMS)'],
] as const

export type Permission = (typeof PERMISSIONS)[number][0]

export const USER_ROLES = [
  'visitor',
  'member',
  'staff_probation',
  'staff',
  'deputy_vp',
  'vp',
  'admin',
  'superadmin',
] as const

export function isUserRole(value: unknown): value is (typeof USER_ROLES)[number] {
  return typeof value === 'string' && USER_ROLES.includes(value as (typeof USER_ROLES)[number])
}

export function hasGroup(user: User | null | undefined, groupSlug: string): boolean {
  if (!user || !user.groups) return false

  return user.groups.some((g) => {
    if (typeof g === 'string') return false // Should be populated
    if (typeof g === 'number') return false
    return (g as Group).slug === groupSlug
  })
}

export function isSuperadmin(user: User | null | undefined): boolean {
  return Boolean(user?.roles?.includes('superadmin') || hasGroup(user, 'superadmin'))
}

export function hasPermission(user: User | null | undefined, permission: Permission): boolean {
  if (!user) return false

  // Superadmin has all permissions
  if (isSuperadmin(user)) {
    return true
  }

  // Admin has every ordinary capability. Privilege-granting mutations call
  // isSuperadmin directly and deliberately do not flow through this shortcut.
  if (user.roles?.includes('admin') || hasGroup(user, 'admin')) {
    return true
  }

  if (!user.groups) return false

  return user.groups.some((g) => {
    if (typeof g === 'string' || typeof g === 'number') return false
    const group = g as Group
    const perms = group.permissions as Record<string, boolean> | undefined
    return perms?.[permission] === true
  })
}

export function canInteractAsMember(user: User | null | undefined): boolean {
  if (!user || !user.roles || user.roles.length === 0) return false

  return user.roles.some((role) =>
    ['member', 'staff_probation', 'staff', 'deputy_vp', 'vp', 'admin', 'superadmin'].includes(role)
  )
}

/**
 * REST access for form-submissions (Local API calls bypass this via overrideAccess).
 * Owners see their own; only manage_forms can list/edit everyone's.
 */
export const formSubmissionAccess = {
  read: ({ req: { user } }: { req: { user?: User | null } }) => {
    if (!user) return false
    if (hasPermission(user, 'manage_forms')) return true
    return { user: { equals: user.id } }
  },
  create: ({ req: { user } }: { req: { user?: User | null } }) => canInteractAsMember(user),
  update: ({ req: { user } }: { req: { user?: User | null } }) => hasPermission(user, 'manage_forms'),
  delete: ({ req: { user } }: { req: { user?: User | null } }) => hasPermission(user, 'manage_forms'),
}

/** A group is privileged if it is admin/superadmin or grants any permission. */
export function isPrivilegedGroup(group: Pick<Group, 'slug' | 'permissions'>): boolean {
  if (['admin', 'superadmin'].includes(group.slug)) return true
  const perms = group.permissions as Record<string, unknown> | null | undefined
  return !!perms && Object.values(perms).some((v) => v === true)
}

/** Requires populated groups when privilege comes from a group rather than a role. */
export function isPrivilegedUser(user: Pick<User, 'roles' | 'groups'>): boolean {
  if (user.roles?.some((role) => ['admin', 'superadmin'].includes(role))) return true
  return Boolean(user.groups?.some(
    (group) => typeof group === 'object' && group !== null && isPrivilegedGroup(group),
  ))
}
