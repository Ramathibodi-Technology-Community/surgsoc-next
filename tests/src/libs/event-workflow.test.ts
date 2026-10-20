import { describe, expect, it, vi } from 'vitest'
import { canManageEvent, queueRegistrationNotification } from '@/libs/event-workflow'
import { getUserEventStatuses, mapPayloadEvent, deriveEventCta } from '@/libs/event'
import { NotificationService } from '@/libs/notifications'

describe('event workflows', () => {
  it('allows parent owners to manage their days, but not unrelated members', () => {
    const event = { owner: 2, parent_event: { owner: 7 } } as any
    expect(canManageEvent({ id: 7, roles: ['member'] } as any, event)).toBe(true)
    expect(canManageEvent({ id: 8, roles: ['member'] } as any, event)).toBe(false)
  })

  it('parent cards show day navigation after an application, without inventing an acceptance status', async () => {
    const payload = { find: vi.fn().mockResolvedValue({ docs: [{ event: { id: 2, parent_event: 1 }, status: 'accepted' }] }) }
    const statuses = await getUserEventStatuses(payload as any, 7, [1])
    expect(statuses).toEqual({ '1': 'applied', '2': 'accepted' })
    const event = mapPayloadEvent({ id: 1, event_structure: 'multi_day', subscription_form: 9, date_begin: '2999-01-01' }, statuses['1'])
    expect(deriveEventCta(event)?.kind).toBe('view_days')
  })

  it('does not offer registration without a form, and offers withdrawal separately from a pending standing', () => {
    expect(deriveEventCta(mapPayloadEvent({ id: 1, date_begin: '2999-01-01' }))).toBeNull()
    expect(deriveEventCta(mapPayloadEvent({ id: 1, date_begin: '2999-01-01' }, 'applicant'))?.secondaryAction?.kind).toBe('withdraw')
  })

  it('sends acceptance only after commit and never sends mail on rollback', async () => {
    const send = vi.spyOn(NotificationService, 'sendRegistrationAccepted').mockResolvedValue()
    const committed: string[] = []
    const session = { resolve: vi.fn(async () => { committed.push('commit') }), db: {} }
    const payload = { db: { sessions: { tx: session } }, findByID: vi.fn().mockImplementation(async ({ collection }) => collection === 'registrations' ? { status: 'accepted' } : { id: 1, name: 'Day', location: null }), logger: { error: vi.fn() } }
    await queueRegistrationNotification(payload as any, { id: 1, event: 1, user: 7, status: 'accepted' }, { transactionID: 'tx', context: {} } as any)
    expect(send).not.toHaveBeenCalled()
    await session.resolve()
    expect(committed).toEqual(['commit'])
    expect(send).toHaveBeenCalledTimes(1)
    const failedCommit = { resolve: vi.fn(async () => {}), db: {} }
    ;(payload.db.sessions as any).failed = failedCommit
    payload.findByID.mockResolvedValueOnce({ status: 'applicant' })
    await queueRegistrationNotification(payload as any, { id: 3, event: 1, user: 9, status: 'accepted' }, { transactionID: 'failed', context: {} } as any)
    await failedCommit.resolve()
    expect(send).toHaveBeenCalledTimes(1)
    const rolledBack = { resolve: vi.fn(async () => {}), db: {} }
    ;(payload.db.sessions as any).rollback = rolledBack
    await queueRegistrationNotification(payload as any, { id: 2, event: 1, user: 8, status: 'accepted' }, { transactionID: 'rollback', context: {} } as any)
    // Rollback does not invoke session.resolve.
    expect(send).toHaveBeenCalledTimes(1)
    send.mockRestore()
  })
})
