import { describe, expect, it } from 'vitest'
import { assignmentState, isBlockingAssignment } from '@/libs/form-assignment-lifecycle'
import { canAssignForms } from '@/libs/permissions'

const now = new Date('2026-09-21T12:00:00.000Z')

describe('form assignment lifecycle', () => {
  it('derives dormant, pending, overdue, complete, and cancelled states without a scheduler', () => {
    expect(assignmentState({ active_at: '2026-09-21T12:01:00.000Z', deadline: '2026-09-22T00:00:00.000Z' }, now)).toBe('dormant')
    expect(assignmentState({ active_at: '2026-09-21T11:00:00.000Z', deadline: '2026-09-22T00:00:00.000Z' }, now)).toBe('pending')
    expect(assignmentState({ active_at: '2026-09-20T00:00:00.000Z', deadline: '2026-09-21T11:59:00.000Z' }, now)).toBe('overdue')
    expect(assignmentState({ completed: true, deadline: '2026-09-20T00:00:00.000Z' }, now)).toBe('complete')
    expect(assignmentState({ cancelled_at: '2026-09-20T00:00:00.000Z', deadline: '2026-09-20T00:00:00.000Z' }, now)).toBe('cancelled')
  })

  it('blocks only an active incomplete assignment after its deadline', () => {
    expect(isBlockingAssignment({ active_at: '2026-09-21T12:01:00.000Z', deadline: '2026-09-20T00:00:00.000Z' }, now)).toBe(false)
    expect(isBlockingAssignment({ active_at: '2026-09-20T00:00:00.000Z', deadline: '2026-09-21T11:59:00.000Z' }, now)).toBe(true)
    expect(isBlockingAssignment({ completed: true, deadline: '2026-09-21T11:59:00.000Z' }, now)).toBe(false)
  })

  it('allows assignment operations only for VP, President/admin, and superadmin roles', () => {
    for (const role of ['vp', 'admin', 'superadmin']) expect(canAssignForms({ roles: [role] } as any)).toBe(true)
    for (const role of ['visitor', 'member', 'staff', 'deputy_vp']) expect(canAssignForms({ roles: [role] } as any)).toBe(false)
    expect(canAssignForms({ roles: ['staff'], groups: [{ slug: 'forms', permissions: { manage_forms: true } }] } as any)).toBe(false)
  })
})
