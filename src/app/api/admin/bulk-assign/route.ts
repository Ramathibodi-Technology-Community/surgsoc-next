
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'
import { hasPermission, isPrivilegedGroup, isSuperadmin, isUserRole } from '@/libs/permissions'
import type { User } from '@/payload-types'
import { findTags } from '@/libs/tags'

const BULK_ASSIGN_LIMIT = 1000

/*
  The taxonomy filters this endpoint accepts: the request key, the tag kind its
  value must belong to, and the user field to match on. `academic.year` uses
  dot notation because the field lives inside the `academic` group.
*/
const TAG_FILTERS = [
  { key: 'department', kind: 'department', field: 'department' },
  { key: 'year', kind: 'year', field: 'academic.year' },
  { key: 'track', kind: 'track', field: 'academic.track' },
] as const

export async function POST(req: NextRequest) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })

  if (!hasPermission(user as User, 'manage_users')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const { mode, groupId, userIds, filters } = await req.json()

    if (mode !== 'selected' && mode !== 'all') {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
    }

    if (!groupId) {
      return NextResponse.json({ error: 'Missing Group ID' }, { status: 400 })
    }

    // The group must exist, and only superadmins may hand out privileged groups.
    let group
    try {
      group = await payload.findByID({ collection: 'groups', id: groupId, depth: 0 })
    } catch (error) {
      const status = typeof error === 'object' && error !== null && 'status' in error
        ? (error as { status?: unknown }).status
        : undefined
      if (
        status === 400 ||
        status === 404 ||
        (error instanceof Error && error.message.toLowerCase() === 'not found')
      ) {
        return NextResponse.json({ error: 'Unknown Group ID' }, { status: 400 })
      }
      throw error
    }

    if (!group) {
      return NextResponse.json({ error: 'Unknown Group ID' }, { status: 400 })
    }

    if (isPrivilegedGroup(group) && !isSuperadmin(user as User)) {
      return NextResponse.json(
        { error: 'Only superadmins can assign privileged groups' },
        { status: 403 },
      )
    }

    // Fetch target user docs in ONE query instead of N+1 round-trips
    let targetUsers: Array<{ id: string | number; groups?: unknown }> = []

    if (mode === 'selected' && Array.isArray(userIds) && userIds.length > 0) {
      const result = await payload.find({
        collection: 'users',
        where: { id: { in: userIds } },
        limit: Math.min(userIds.length, BULK_ASSIGN_LIMIT),
        depth: 0,
      })
      targetUsers = result.docs
    } else if (mode === 'all') {
      // Build query based on (validated) filters
      const where: any = {}
      if (
        filters?.role &&
        typeof filters.role === 'string' &&
        isUserRole(filters.role)
      ) {
        where.roles = { contains: filters.role }
      }
      /*
        Taxonomy filters. Each is a tag id, so the allowed set is rows rather
        than a literal list. An unrecognised id is rejected instead of ignored:
        the filter is the only thing bounding a write to up to 1000 users, and
        silently dropping it turns "assign this group to the IA department"
        into "assign it to everyone".

        Year and track are here because they no longer have groups of their
        own. They used to be addressed by picking their group from the same
        dropdown as Staff or Admin, which meant the same fact — a user is in
        year 3 — lived both as a tag on the user and as a group membership.
        Filtering the tag directly is the one that was already true.
      */
      for (const { field, key, kind } of TAG_FILTERS) {
        if (filters?.[key] == null) continue

        const id = Number(filters[key])
        const allowed = await findTags(payload, kind)

        if (!Number.isInteger(id) || !allowed.some((tag) => Number(tag.id) === id)) {
          return NextResponse.json({ error: `Unknown ${key} filter` }, { status: 400 })
        }
        where[field] = { equals: id }
      }

      const users = await payload.find({
        collection: 'users',
        where,
        limit: BULK_ASSIGN_LIMIT,
        depth: 0,
      })
      targetUsers = users.docs
    }

    if (targetUsers.length === 0) {
      return NextResponse.json({ message: 'No users to update', count: 0 }, { status: 200 })
    }

    // Filter out users who already have this group (no DB calls needed — we have the docs)
    const usersNeedingUpdate = targetUsers.filter((u) => {
      const raw = Array.isArray(u.groups) ? u.groups : []
      const currentGroups = raw.map((g) =>
        typeof g === 'object' && g !== null ? String((g as { id: unknown }).id) : String(g),
      )
      return !currentGroups.includes(String(groupId))
    })

    // Run updates in bounded parallel batches to respect Postgres connection pool
    const BATCH_SIZE = 10
    const failedIds: Array<{ id: string | number; error: string }> = []
    let successCount = 0

    for (let i = 0; i < usersNeedingUpdate.length; i += BATCH_SIZE) {
      const batch = usersNeedingUpdate.slice(i, i + BATCH_SIZE)
      const results = await Promise.allSettled(
        batch.map((u) => {
          const raw = Array.isArray(u.groups) ? u.groups : []
          const currentGroups = raw.map((g) =>
            typeof g === 'object' && g !== null ? String((g as { id: unknown }).id) : String(g),
          )
          return payload.update({
            collection: 'users',
            id: u.id,
            data: {
              groups: [...currentGroups, groupId],
            } as any,
            context: { skipGroupSync: true },
          })
        }),
      )
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled') {
          successCount += 1
        } else {
          failedIds.push({
            id: batch[idx].id,
            error: r.reason?.message ?? 'Unknown error',
          })
        }
      })
    }

    return NextResponse.json({
      success: failedIds.length === 0,
      message: `Assigned group to ${successCount} of ${targetUsers.length} users.`,
      count: successCount,
      skipped: targetUsers.length - usersNeedingUpdate.length,
      failedIds,
    })
  } catch (error) {
    payload.logger.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
