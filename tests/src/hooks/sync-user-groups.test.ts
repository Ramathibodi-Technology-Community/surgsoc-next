import { describe, expect, it, vi } from 'vitest'
import { syncUserGroups } from '@/hooks/sync-user-groups'

/**
 * `syncUserGroups` runs before every user write and decides which groups a
 * member holds — which is what `hasPermission` resolves capabilities through.
 * It used to read three hardcoded slug maps; it now follows `groups.tag`.
 *
 * That rewrite is the riskiest part of the tags migration: a mismatch here does
 * not throw, it silently grants or removes permissions. These pin the four
 * things the rewrite has to keep true.
 */
const GROUPS = [
  { id: 1, slug: 'member', type: 'system', tag: null },
  { id: 2, slug: 'staff', type: 'role', tag: null },
  { id: 3, slug: 'admin', type: 'system', tag: null },
  { id: 4, slug: 'dept-ia', type: 'department', tag: 41 },
  { id: 5, slug: 'dept-pr', type: 'department', tag: 42 },
  // Left in deliberately. Year/track groups were removed, but a database that
  // has not run the migration still has rows like these — the hook must ignore
  // them rather than depend on them being absent.
  { id: 6, slug: 'year-2', type: 'year', tag: 21 },
  { id: 7, slug: 'track-md', type: 'track', tag: 11 },
]

// type 'access' — manually assigned, never auto-managed, so the find below
// (which filters on the auto types) never returns it.
const MANUAL_GROUP_ID = 99

function makeArgs(data: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return {
    data,
    operation: 'update' as const,
    req: {
      payload: {
        // Honours the type filter the hook sends, so AUTO_GROUP_TYPES is
        // exercised here rather than assumed.
        find: vi.fn(async ({ where }: { where: { type: { in: string[] } } }) => ({
          docs: GROUPS.filter((g) => where.type.in.includes(g.type)),
        })),
      },
      context: {},
    },
    ...extra,
  } as never
}

const run = async (data: Record<string, unknown>, extra?: Record<string, unknown>) => {
  const result = (await syncUserGroups(makeArgs(data, extra))) as Record<string, unknown>
  return (result.groups as number[]).sort((a, b) => a - b)
}

describe('syncUserGroups', () => {
  it('resolves a department tag to the group that points at it', async () => {
    expect(await run({ roles: ['staff'], department: 41 })).toEqual([2, 4])
  })

  it('reads a populated relationship as well as a bare id', async () => {
    // A partial update carries the raw posted id; `originalDoc` carries a
    // populated object. Both have to land on the same group.
    expect(await run({ roles: [], department: { id: 42, slug: 'dept-pr' } })).toEqual([5])
  })

  it('does not mint a group for a year or track tag', async () => {
    // Year and track live only on the user now. They granted no permissions,
    // so mirroring them as groups stored the same fact twice. GROUPS still
    // contains an unmigrated year-2/track-md row; neither may be picked up.
    const groups = await run({
      roles: ['member'],
      department: 41,
      academic: { year: 21, track: 11 },
    })
    expect(groups).toEqual([1, 4])
  })

  it('never invents a group for a tag no group points at', async () => {
    // A brand new specialty tag is not a membership. Resolving it to nothing is
    // the correct answer; resolving it to *something* would be a grant.
    expect(await run({ roles: [], department: 999 })).toEqual([])
  })

  it('keeps manually assigned groups and drops stale auto ones', async () => {
    const groups = await run(
      { roles: ['member'], department: 41 },
      // Was in PR, is now in IA, and holds one manual access group.
      { originalDoc: { groups: [MANUAL_GROUP_ID, 5, 2] } },
    )
    expect(groups).toEqual([1, 4, MANUAL_GROUP_ID])
  })

  it('leaves groups alone when the caller opts out', async () => {
    const args = makeArgs({ roles: ['admin'], groups: [MANUAL_GROUP_ID] }) as Record<string, any>
    args.req.context = { skipGroupSync: true }

    const result = (await syncUserGroups(args as never)) as Record<string, unknown>
    expect(result.groups).toEqual([MANUAL_GROUP_ID])
  })

  it('still maps roles by slug, not by tag', async () => {
    // Roles are security identities and deliberately stayed hardcoded — a
    // `superadmin` group must not be mintable by anyone who can add a tag.
    expect(await run({ roles: ['admin'] })).toEqual([3])
  })
})
