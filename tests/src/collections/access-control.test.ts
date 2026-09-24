import { beforeEach, describe, expect, it, vi } from 'vitest'

const payloadMock = {
  auth: vi.fn(),
  findByID: vi.fn(),
  find: vi.fn(),
  update: vi.fn(),
  logger: { error: vi.fn() },
}

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn(async () => payloadMock) }))
vi.mock('next/headers', () => ({ headers: vi.fn(async () => ({})) }))

import { Events } from '@/collections/Events'
import { Attendings } from '@/collections/Attendings'
import { Registrations } from '@/collections/Registrations'
import { formSubmissionAccess } from '@/libs/permissions'

// A plain member: no groups, no permissions. The attacker in every case below.
const member = { id: 7, roles: ['member'], groups: [] } as any
const manager = {
  id: 1,
  roles: ['staff'],
  groups: [{ slug: 'ea', permissions: { manage_events: true } }],
} as any
const contentManager = {
  id: 2,
  roles: ['staff'],
  groups: [{ slug: 'pr', permissions: { manage_content: true } }],
} as any
const formManager = {
  id: 3,
  roles: ['staff'],
  groups: [{ slug: 'ad', permissions: { manage_forms: true } }],
} as any
const visitor = { id: 9, roles: ['visitor'], groups: [] } as any

const as = (user: any) => ({ req: { user } }) as any

describe('form-submissions access', () => {
  it('scopes a member to their own submissions', () => {
    expect(formSubmissionAccess.read(as(member))).toEqual({ user: { equals: 7 } })
  })

  it('lets manage_forms read everything', () => {
    expect(formSubmissionAccess.read(as(formManager))).toBe(true)
  })

  it('denies anonymous reads and writes', () => {
    expect(formSubmissionAccess.read(as(null))).toBe(false)
    expect(formSubmissionAccess.create(as(null))).toBe(false)
  })

  it('lets members submit but not visitors', () => {
    expect(formSubmissionAccess.create(as(member))).toBe(true)
    expect(formSubmissionAccess.create(as(visitor))).toBe(false)
  })

  it('blocks members from editing or deleting submissions', () => {
    expect(formSubmissionAccess.update(as(member))).toBe(false)
    expect(formSubmissionAccess.delete(as(member))).toBe(false)
  })
})

describe('registrations beforeChange guard', () => {
  const guard = (Registrations.hooks!.beforeChange as any[])[0]

  it('strips status and ownership changes from a member update', () => {
    const data = guard({
      req: { user: member },
      operation: 'update',
      data: { status: 'participant', user: 999, selected_by: 999, rejection_reason: 'x' },
    })
    expect(data).toEqual({ rejection_reason: 'x' })
  })

  it('leaves manage_events untouched', () => {
    const input = { status: 'accepted', user: 999, selected_by: 1 }
    expect(guard({ req: { user: manager }, operation: 'update', data: input })).toEqual(input)
  })

  it('leaves Local API calls (no req.user) untouched', () => {
    const input = { status: 'confirmed' }
    expect(guard({ req: {}, operation: 'update', data: input })).toEqual(input)
  })
})

describe('events / attendings read access', () => {
  it('hides invisible events from members and anonymous', () => {
    expect(Events.access!.read!(as(member))).toEqual({ is_visible: { equals: true } })
    expect(Events.access!.read!(as(null))).toEqual({ is_visible: { equals: true } })
  })

  it('shows everything to manage_events', () => {
    expect(Events.access!.read!(as(manager))).toBe(true)
  })

  it('hides invisible attendings from members', () => {
    expect(Attendings.access!.read!(as(member))).toEqual({ is_visible: { equals: true } })
    expect(Attendings.access!.read!(as(contentManager))).toBe(true)
  })
})

describe('POST /api/admin/bulk-assign', () => {
  const post = async (body: unknown) => {
    const { POST } = await import('@/app/api/admin/bulk-assign/route')
    return POST(
      new Request('http://localhost/api/admin/bulk-assign', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'content-type': 'application/json' },
      }) as any,
    )
  }

  beforeEach(() => {
    payloadMock.auth.mockReset()
    payloadMock.findByID.mockReset()
    payloadMock.find.mockReset()
    payloadMock.update.mockReset()
  })

  it('rejects a plain member', async () => {
    payloadMock.auth.mockResolvedValue({ user: member })
    expect((await post({ mode: 'all', groupId: 1 })).status).toBe(403)
    expect(payloadMock.update).not.toHaveBeenCalled()
  })

  it('rejects an unknown group id', async () => {
    payloadMock.auth.mockResolvedValue({
      user: { id: 1, roles: ['staff'], groups: [{ slug: 'ad', permissions: { manage_users: true } }] },
    })
    payloadMock.findByID.mockRejectedValue(new Error('not found'))
    expect((await post({ mode: 'all', groupId: 4242 })).status).toBe(400)
  })

  it('stops a manage_users staffer from granting a privileged group', async () => {
    payloadMock.auth.mockResolvedValue({
      user: { id: 1, roles: ['staff'], groups: [{ slug: 'ad', permissions: { manage_users: true } }] },
    })
    payloadMock.findByID.mockResolvedValue({ id: 2, slug: 'admin', permissions: {} })
    expect((await post({ mode: 'all', groupId: 2 })).status).toBe(403)
    expect(payloadMock.update).not.toHaveBeenCalled()
  })

  it('lets a superadmin grant a privileged group', async () => {
    payloadMock.auth.mockResolvedValue({
      user: { id: 1, roles: ['superadmin'], groups: [{ slug: 'superadmin', permissions: {} }] },
    })
    payloadMock.findByID.mockResolvedValue({ id: 2, slug: 'admin', permissions: {} })
    payloadMock.find.mockResolvedValue({ docs: [{ id: 7, groups: [] }] })
    payloadMock.update.mockResolvedValue({})

    const res = await post({ mode: 'all', groupId: 2 })
    expect(res.status).toBe(200)
    expect(payloadMock.update).toHaveBeenCalledTimes(1)
  })
})

describe('safeRedirectPath', () => {
  it('keeps same-origin absolute paths', async () => {
    const { safeRedirectPath } = await import('@/libs/utils')
    expect(safeRedirectPath('/events/3/confirm')).toBe('/events/3/confirm')
  })

  it('rejects open-redirect vectors', async () => {
    const { safeRedirectPath } = await import('@/libs/utils')
    for (const evil of ['//evil.com', '/\\evil.com', 'https://evil.com', 'evil.com', '', null, 5]) {
      expect(safeRedirectPath(evil)).toBe('/account')
    }
  })
})

/*
  ── Full access matrix ──────────────────────────────────────────────────────

  Every collection × every operation × every tier. The blocks above cover the
  specific holes past sessions closed; this covers the surface none of them
  looked at, so a widened rule trips a test instead of shipping.

  Collection `access` functions are pure — `({ req: { user } }) => boolean |
  Where` — so they need no live Payload, which is what keeps this inside the
  repo's "pure helpers only" testing rule.

  It asserts the RETURNED VALUE, never truthiness. `true` and
  `{ user: { equals: 7 } }` are both "allowed" and mean very different things:
  one is global, the other is scoped to rows you own. A regression that widened
  the second into the first would pass a truthiness check.
*/

import { Users } from '@/collections/Users'
import { Groups } from '@/collections/Groups'
import { Tags } from '@/collections/Tags'
import { TeamMembers } from '@/collections/TeamMembers'
import { FeatureRequests } from '@/collections/FeatureRequests'
import { FormAssignments } from '@/collections/FormAssignments'

/*
  The tiers. Two overlapping systems meet here: `roles` on the user and
  `permissions` granted by groups. `hasPermission` short-circuits ONLY for
  admin/superadmin — every other role grants nothing on its own, which is why
  `staffNoGroups` and `memberWithEventPerm` are the interesting rows.
*/
const anon = null as any
const staffNoGroups = { id: 11, roles: ['staff'], groups: [] } as any
const memberWithEventPerm = {
  id: 12,
  roles: ['member'],
  groups: [{ slug: 'ea', permissions: { manage_events: true } }],
} as any
const userManager = {
  id: 13,
  roles: ['staff'],
  groups: [{ slug: 'ad', permissions: { manage_users: true } }],
} as any
const viewer = {
  id: 14,
  roles: ['staff'],
  groups: [{ slug: 'obs', permissions: { view_users: true } }],
} as any
const admin = { id: 15, roles: ['admin'], groups: [] } as any
const superadmin = { id: 16, roles: ['superadmin'], groups: [] } as any

const call = (fn: any, user: any, context?: any) => fn({ req: { user, context } })

describe('the two permission systems compose', () => {
  it('grants a plain role nothing — only admin/superadmin short-circuit', () => {
    // `staff` is an identity, not a capability. Without a group it is a member
    // with a nicer label, and every collection below must treat it that way.
    expect(Events.access!.create!(as(staffNoGroups))).toBe(false)
    expect(Users.access!.delete!(as(staffNoGroups))).toBe(false)
    expect(Tags.access!.create!(as(staffNoGroups))).toBe(false)
  })

  it('grants a group permission without any elevated role', () => {
    // The mirror case: `member` + a group carrying manage_events is a full
    // event manager. This is the interaction that makes roles-as-tags unsafe.
    expect(Events.access!.create!(as(memberWithEventPerm))).toBe(true)
    expect(Events.access!.read!(as(memberWithEventPerm))).toBe(true)
  })

  it('gives admin and superadmin everything without a single group', () => {
    for (const user of [admin, superadmin]) {
      expect(Events.access!.create!(as(user))).toBe(true)
      expect(Users.access!.delete!(as(user))).toBe(true)
      expect(Groups.access!.update!(as(user))).toBe(true)
      expect(Tags.access!.delete!(as(user))).toBe(true)
    }
  })
})

describe('users access', () => {
  it('scopes a member to their own record on read and update', () => {
    expect(Users.access!.read!(as(member))).toEqual({ id: { equals: 7 } })
    expect(Users.access!.update!(as(member))).toEqual({ id: { equals: 7 } })
  })

  it('denies anonymous entirely', () => {
    expect(Users.access!.read!(as(anon))).toBe(false)
    expect(Users.access!.update!(as(anon))).toBe(false)
    expect(Users.access!.delete!(as(anon))).toBe(false)
  })

  it('separates view_users from manage_users', () => {
    // view_users reads everyone but must not be able to edit or delete them.
    expect(Users.access!.read!(as(viewer))).toBe(true)
    expect(Users.access!.update!(as(viewer))).toEqual({ id: { equals: 14 } })
    expect(Users.access!.delete!(as(viewer))).toBe(false)
    expect(Users.access!.read!(as(userManager))).toBe(true)
    expect(Users.access!.update!(as(userManager))).toBe(true)
    expect(Users.access!.delete!(as(userManager))).toBe(true)
  })

  it('only creates users via the OAuth flow flag or manage_users', () => {
    // The context flag is what lets a brand-new Google sign-in write a row
    // with no authenticated user behind the request. Anything else is closed.
    expect(call(Users.access!.create!, anon, { isOAuthFlow: true })).toBe(true)
    expect(call(Users.access!.create!, anon)).toBe(false)
    expect(call(Users.access!.create!, member)).toBe(false)
    expect(call(Users.access!.create!, userManager)).toBe(true)
  })
})

describe('public-read collections', () => {
  it('serves tags and team members to anonymous callers', () => {
    // Deliberate: tags are the public vocabulary and the team roster is a
    // public page. Asserted so making them public is never an accident.
    expect(Tags.access!.read!(as(anon))).toBe(true)
    expect(TeamMembers.access!.read!(as(anon))).toBe(true)
  })

  it('still gates writes on manage_content', () => {
    for (const collection of [Tags, TeamMembers]) {
      expect(collection.access!.create!(as(anon))).toBe(false)
      expect(collection.access!.create!(as(member))).toBe(false)
      expect(collection.access!.update!(as(member))).toBe(false)
      expect(collection.access!.delete!(as(member))).toBe(false)
      expect(collection.access!.create!(as(contentManager))).toBe(true)
      expect(collection.access!.delete!(as(contentManager))).toBe(true)
    }
  })
})

describe('groups access', () => {
  it('stays readable to every authenticated user, and no one else', () => {
    /*
      Documented as deliberate at Groups.ts:13-17 — `hasPermission` resolves
      user → groups → permissions on every authenticated request, so gating
      this breaks the capability model for non-staff. Asserted here so a
      well-meaning "harden it" change fails loudly rather than breaking auth.
      The cost is real and accepted: the permission bitmask is visible to any
      logged-in user.
    */
    expect(Groups.access!.read!(as(member))).toBe(true)
    expect(Groups.access!.read!(as(visitor))).toBe(true)
    expect(Groups.access!.read!(as(anon))).toBe(false)
  })

  it('confines group writes to manage_users', () => {
    // Groups carry the permission bitmask, so write access here is privilege
    // escalation by another name.
    expect(Groups.access!.create!(as(memberWithEventPerm))).toBe(false)
    expect(Groups.access!.update!(as(contentManager))).toBe(false)
    expect(Groups.access!.delete!(as(member))).toBe(false)
    expect(Groups.access!.create!(as(userManager))).toBe(true)
  })
})

describe('privilege mutation guards', () => {
  const groupChange = (Groups.hooks!.beforeChange as any[])[0]
  const groupDelete = (Groups.hooks!.beforeDelete as any[])[0]
  const userChange = (Users.hooks!.beforeChange as any[])[0]
  const userDelete = (Users.hooks!.beforeDelete as any[])[0]

  beforeEach(() => {
    payloadMock.find.mockReset()
    payloadMock.findByID.mockReset()
  })

  it('stops manage_users from minting or changing a privileged group', () => {
    expect(() => groupChange({
      data: { slug: 'editors', permissions: { manage_events: true } },
      req: { user: userManager },
    })).toThrow(/superadmin/i)

    expect(() => groupChange({
      data: { description: 'renamed' },
      originalDoc: { slug: 'editors', permissions: { manage_events: true } },
      req: { user: userManager },
    })).toThrow(/superadmin/i)
  })

  it('stops manage_users from deleting a privileged group', async () => {
    payloadMock.findByID.mockResolvedValue({
      id: 3,
      slug: 'events',
      permissions: { manage_events: true },
    })

    await expect(groupDelete({ id: 3, req: { user: userManager, payload: payloadMock } }))
      .rejects.toThrow(/superadmin/i)
  })

  it('stops manage_users from assigning admin roles or privileged groups', async () => {
    const base = {
      operation: 'update',
      originalDoc: { id: 7, roles: ['member'], groups: [] },
      req: { user: userManager, payload: payloadMock, context: {} },
    }

    await expect(userChange({ ...base, data: { roles: ['admin'] } }))
      .rejects.toThrow(/admin roles/i)

    payloadMock.find.mockResolvedValue({
      docs: [{ id: 3, slug: 'events', permissions: { manage_events: true } }],
    })
    await expect(userChange({ ...base, data: { groups: [3] } }))
      .rejects.toThrow(/privileged groups/i)
  })

  it('protects privileged users from update and deletion', async () => {
    const target = { id: 15, roles: ['admin'], groups: [] }

    await expect(userChange({
      data: { email: 'changed@example.com' },
      operation: 'update',
      originalDoc: target,
      req: { user: userManager, payload: payloadMock, context: {} },
    })).rejects.toThrow(/privileged users/i)

    payloadMock.findByID.mockResolvedValue(target)
    await expect(userDelete({ id: 15, req: { user: userManager, payload: payloadMock } }))
      .rejects.toThrow(/privileged users/i)
  })

  it('lets a superadmin perform the privileged operation', async () => {
    const data = { roles: ['superadmin'] }
    payloadMock.find.mockResolvedValue({ docs: [] })

    await expect(userChange({
      data,
      operation: 'update',
      originalDoc: {
        id: 7,
        roles: ['member'],
        groups: [],
        name_thai: { first_name: 'สม', last_name: 'ชาย' },
        academic: { student_id: '123456' },
      },
      req: { user: superadmin, payload: payloadMock, context: { skipGroupSync: true } },
    })).resolves.toBe(data)
  })
})

describe('feature-requests access', () => {
  it('lets any authenticated user file one, including a visitor', () => {
    // Deliberate — feedback is open to anyone signed in. Note there is no rate
    // limit anywhere in front of this: an unbounded authenticated write.
    expect(FeatureRequests.access!.create!(as(visitor))).toBe(true)
    expect(FeatureRequests.access!.create!(as(member))).toBe(true)
    expect(FeatureRequests.access!.create!(as(anon))).toBe(false)
  })

  it('keeps everyone else from reading what was filed', () => {
    // Submissions may quote anything; only manage_users sees them at all —
    // including the submitter, who cannot read their own back.
    expect(FeatureRequests.access!.read!(as(member))).toBe(false)
    expect(FeatureRequests.access!.read!(as(contentManager))).toBe(false)
    expect(FeatureRequests.access!.read!(as(userManager))).toBe(true)
  })

  it('pins direct creates to the caller and strips admin-only state', () => {
    const guard = (FeatureRequests.hooks!.beforeChange as any[])[0]
    const data = guard({
      operation: 'create',
      req: { user: member },
      data: { submitted_by: 999, status: 'done', admin_notes: 'forged' },
    })

    expect(data).toEqual({ submitted_by: 7, status: 'open' })
  })
})

describe('users OAuth identity field', () => {
  const googleId = (Users.fields as any[]).find((field) => field.name === 'google_id')

  it('is hidden and immutable outside the trusted OAuth path or superadmin', () => {
    expect(googleId.access.read(as(member))).toBe(false)
    expect(googleId.access.update(as(userManager))).toBe(false)
    expect(googleId.access.read(as(superadmin))).toBe(true)
    expect(googleId.access.update(as(superadmin))).toBe(true)
  })
})

describe('form-assignments access', () => {
  it('scopes a member to their own assignments', () => {
    expect(FormAssignments.access!.read!(as(member))).toEqual({ user: { equals: 7 } })
    expect(FormAssignments.access!.read!(as(anon))).toBe(false)
    expect(FormAssignments.access!.read!(as(formManager))).toBe(true)
  })

  it('never lets an assignee write their own assignment', () => {
    // `completed` lives on this row. A member who could update it would clear
    // their own blocking form and walk through the gate it exists to hold.
    expect(FormAssignments.access!.create!(as(member))).toBe(false)
    expect(FormAssignments.access!.update!(as(member))).toBe(false)
    expect(FormAssignments.access!.delete!(as(member))).toBe(false)
    expect(FormAssignments.access!.update!(as(formManager))).toBe(false)
  })
})

describe('events and registrations write access', () => {
  it('scopes event edits to the owner when the user lacks manage_events', () => {
    expect(Events.access!.update!(as(member))).toEqual({ owner: { equals: 7 } })
    expect(Events.access!.delete!(as(member))).toEqual({ owner: { equals: 7 } })
    expect(Events.access!.update!(as(manager))).toBe(true)
    expect(Events.access!.update!(as(anon))).toBe(false)
    expect(Events.access!.delete!(as(anon))).toBe(false)
  })

  it('routes member applications through the server action and limits direct writes to managers', () => {
    expect(Registrations.access!.create!(as(member))).toBe(false)
    expect(Registrations.access!.create!(as(manager))).toBe(true)
    expect(Registrations.access!.create!(as(visitor))).toBe(false)
    expect(Registrations.access!.read!(as(member))).toEqual({ user: { equals: 7 } })
    expect(Registrations.access!.update!(as(member))).toEqual({ user: { equals: 7 } })
    expect(Registrations.access!.delete!(as(member))).toBe(false)
    expect(Registrations.access!.delete!(as(manager))).toBe(true)
  })
})

describe('attendings contact field is not public', () => {
  const contact = (Attendings.fields as any[]).find((f) => f.name === 'contact')
  const readContact = (user: any, doc: any) => contact.access.read({ req: { user }, doc })

  it('hides email and phone from anonymous callers', () => {
    /*
      The regression this exists for: row-level `read` gates only on
      `is_visible`, so every visible physician's email and phone went out on
      an anonymous `GET /api/attendings` — data the attendings page never
      displayed for them. Verified against the running server: 2 records
      exposed before, 0 after.
    */
    expect(readContact(null, { is_secretary: false })).toBe(false)
    expect(readContact(member, { is_secretary: false })).toBe(false)
    expect(readContact(visitor, { is_secretary: false })).toBe(false)
  })

  it('publishes the flagged secretary, which is the one intended case', () => {
    expect(readContact(null, { is_secretary: true })).toBe(true)
    expect(readContact(member, { is_secretary: true })).toBe(true)
  })

  it('fails closed when the doc is absent', () => {
    // Field access can be evaluated with no doc in some Payload paths; a
    // missing flag must read as "not a secretary", never as permission.
    expect(readContact(null, undefined)).toBe(false)
    expect(readContact(null, {})).toBe(false)
  })

  it('always shows it to manage_content', () => {
    expect(readContact(contentManager, { is_secretary: false })).toBe(true)
  })
})
