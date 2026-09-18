import type { CollectionBeforeChangeHook } from 'payload'
import { tagId, type TagRef } from '../libs/tags'

// ── Role → group slug mapping ────────────────────────
// A single user role may map to multiple group slugs.
//
// Deliberately NOT a tag. Roles are security identities — `admin` and
// `superadmin` grant capability — and turning them into editable rows would let
// anyone with `manage_content` mint a privileged group. The department, year
// and track maps that used to sit beside this one were taxonomy, not security,
// and are now resolved through `groups.tag`.
const ROLE_GROUP_SLUGS: Record<string, string[]> = {
  visitor:         ['visitor'],
  member:          ['member'],
  staff_probation: ['staff'],
  staff:           ['staff'],
  vp:              ['staff'],
  admin:           ['admin'],
  superadmin:      ['superadmin'],
}

/*
  All auto-managed group types (everything except 'access').

  Year and track are absent because they no longer have groups. Those groups
  granted no permissions — they existed only so the assign UI could target a
  year through the same dropdown it used for Staff or Admin. The same fact was
  stored twice: as a tag on the user, and as a membership derived from it.
  Bulk-assign now filters the tag directly.

  Department stays. Its group carries real permissions (`manage_events`,
  `manage_forms`), which a tag cannot hold — tags are public labels with no
  capability bitmask. That is the line: a group exists when membership grants
  something, not merely when it describes something.
*/
const AUTO_GROUP_TYPES = ['system', 'role', 'department']

export const syncUserGroups: CollectionBeforeChangeHook = async ({
  data, originalDoc, req: { payload, context }, operation,
}) => {
  if (operation !== 'update' && operation !== 'create') return data
  if (context?.skipGroupSync) return data

  // For partial updates, merge data with originalDoc
  const roles = data.roles !== undefined ? data.roles : (originalDoc?.roles || [])
  const department = data.department !== undefined ? data.department : originalDoc?.department

  const inputGroups = data.groups !== undefined ? data.groups : (originalDoc?.groups || [])

  // 1. Current group IDs on the user
  const currentGroupIds: number[] = (inputGroups || []).map(
    (g: any) => typeof g === 'object' ? g.id : g
  )

  // 2. Fetch ALL auto-managed groups (system, role, department, year, track).
  //    depth 0 keeps `tag` a bare id, which is all the comparison below needs.
  const autoGroups = await payload.find({
    collection: 'groups',
    where: { type: { in: AUTO_GROUP_TYPES } },
    limit: 100,
    depth: 0,
  })

  // 3. Keep only "manual" groups (type: 'access' or any future custom type)
  const manualGroupIds = currentGroupIds.filter(
    id => !autoGroups.docs.some(g => g.id === id)
  )

  // 4a. Role-driven groups, matched by slug.
  const targetSlugs: string[] = []
  if (roles && Array.isArray(roles)) {
    for (const role of roles) {
      const slugs = ROLE_GROUP_SLUGS[role]
      if (slugs) targetSlugs.push(...slugs)
    }
  }
  const uniqueSlugs = new Set(targetSlugs)

  // 4b. Taxonomy-driven groups, matched by the tag the group points at.
  //     `tagId` accepts either a populated tag or a bare id, because a partial
  //     update carries the raw request value while `originalDoc` carries a
  //     populated one.
  const targetTagIds = new Set(
    [department].map((value) => tagId(value)).filter((id): id is number => id !== null),
  )

  // 5. Resolve to group IDs
  const newAutoGroupIds = autoGroups.docs
    .filter((g) => {
      if (uniqueSlugs.has(g.slug)) return true
      const linked = tagId((g as { tag?: TagRef }).tag)
      return linked !== null && targetTagIds.has(linked)
    })
    .map((g) => g.id)

  const finalGroupIds = [...new Set([...manualGroupIds, ...newAutoGroupIds])]

  // Add the synced groups to the document data before it is saved
  data.groups = finalGroupIds

  return data
}
