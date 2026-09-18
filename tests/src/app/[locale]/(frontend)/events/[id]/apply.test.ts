import { beforeEach, describe, expect, it, vi } from 'vitest'

const payloadMock = {
  auth: vi.fn(),
  findByID: vi.fn(),
  find: vi.fn(),
  create: vi.fn(),
  db: {
    beginTransaction: vi.fn(),
    commitTransaction: vi.fn(),
    rollbackTransaction: vi.fn(),
  },
}

const gateMock = vi.fn()

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({
  getPayload: vi.fn(async () => payloadMock),
}))
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({ mocked: true })),
}))
vi.mock('@/libs/user-action-gate', () => ({
  checkUserActionGate: gateMock,
}))

const importAction = async () =>
  (await import('@/app/[locale]/(frontend)/events/[id]/actions')).submitEventApplication

describe('submitEventApplication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    payloadMock.auth.mockResolvedValue({ user: { id: 7 } })
    payloadMock.findByID.mockResolvedValue({ id: 3, name: 'Event', subscription_form: 9 })
    payloadMock.find.mockResolvedValue({ totalDocs: 0, docs: [] })
    payloadMock.db.beginTransaction.mockResolvedValue('tx_1')
    gateMock.mockResolvedValue({ allowed: true })
  })

  it('refuses when the action gate blocks the user', async () => {
    gateMock.mockResolvedValue({ allowed: false, reason: 'profile_incomplete', message: 'Complete your profile.' })
    const submitEventApplication = await importAction()

    await expect(submitEventApplication('3', { a: 'b' })).rejects.toThrow('Complete your profile.')
    expect(payloadMock.create).not.toHaveBeenCalled()
  })

  it('refuses a second application for the same event', async () => {
    payloadMock.find.mockResolvedValue({ totalDocs: 1, docs: [{ id: 1 }] })
    const submitEventApplication = await importAction()

    await expect(submitEventApplication('3', { a: 'b' })).rejects.toThrow('already applied')
    expect(payloadMock.create).not.toHaveBeenCalled()
  })

  it('creates the submission and an applicant registration in one transaction', async () => {
    payloadMock.create.mockResolvedValue({ id: 1 })
    const submitEventApplication = await importAction()

    await submitEventApplication('3', { a: 'b' })

    expect(payloadMock.create).toHaveBeenNthCalledWith(1, {
      collection: 'form-submissions',
      data: {
        form: 9,
        submissionData: [{ field: 'a', value: 'b' }],
        user: 7,
      },
      req: { transactionID: 'tx_1' },
    })
    expect(payloadMock.create).toHaveBeenNthCalledWith(2, {
      collection: 'registrations',
      data: { event: 3, user: 7, status: 'applicant', submission: 1 },
      req: { transactionID: 'tx_1' },
    })
    expect(payloadMock.db.commitTransaction).toHaveBeenCalledWith('tx_1')
    expect(payloadMock.db.rollbackTransaction).not.toHaveBeenCalled()
  })

  it('rolls back — leaving no half-written row — when the registration write fails', async () => {
    payloadMock.create
      .mockResolvedValueOnce({ id: 1 })
      .mockRejectedValueOnce(new Error('db exploded'))
    const submitEventApplication = await importAction()

    await expect(submitEventApplication('3', { a: 'b' })).rejects.toThrow('Failed to submit registration')

    expect(payloadMock.db.rollbackTransaction).toHaveBeenCalledWith('tx_1')
    expect(payloadMock.db.commitTransaction).not.toHaveBeenCalled()
  })

  it('refuses an event without its own registration form', async () => {
    payloadMock.findByID.mockResolvedValue({ id: 3, name: 'Event', subscription_form: null })
    const submitEventApplication = await importAction()

    await expect(submitEventApplication('3', { a: 'b' })).rejects.toThrow(
      'This event has no registration form.',
    )
    expect(payloadMock.create).not.toHaveBeenCalled()
  })
})

describe('getUserEventStatuses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns nothing for an anonymous visitor without querying', async () => {
    const { getUserEventStatuses } = await import('@/libs/event')

    expect(await getUserEventStatuses(payloadMock as any, null, [1, 2])).toEqual({})
    expect(payloadMock.find).not.toHaveBeenCalled()
  })

  it('keys each registration status by event id', async () => {
    payloadMock.find.mockResolvedValue({
      docs: [
        { event: 1, status: 'applicant' },
        { event: { id: 2 }, status: 'accepted' },
      ],
    })
    const { getUserEventStatuses } = await import('@/libs/event')

    expect(await getUserEventStatuses(payloadMock as any, 7, [1, 2])).toEqual({
      '1': 'applicant',
      '2': 'accepted',
    })
  })

  it('feeds deriveEventCta a real status instead of the phantom user_status field', async () => {
    const { mapPayloadEvent, deriveEventCta } = await import('@/libs/event')

    const doc = { id: 1, name: 'Event', date_begin: '2999-01-01T00:00:00.000Z' }
    expect(deriveEventCta(mapPayloadEvent(doc))?.kind).toBe('register')
    expect(deriveEventCta(mapPayloadEvent(doc, 'applicant'))?.kind).toBe('waiting_list')
    expect(deriveEventCta(mapPayloadEvent(doc, 'accepted'))?.kind).toBe('confirm')
  })
})
