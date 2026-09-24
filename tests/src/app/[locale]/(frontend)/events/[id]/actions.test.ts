import { beforeEach, describe, expect, it, vi } from 'vitest'

const payloadMock = {
  auth: vi.fn(),
  find: vi.fn(),
  findByID: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  db: { beginTransaction: vi.fn(), commitTransaction: vi.fn(), rollbackTransaction: vi.fn() },
}

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({
  getPayload: vi.fn(async () => payloadMock),
}))
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({ mocked: true })),
}))
vi.mock('@/libs/user-action-gate', () => ({
  checkUserActionGate: vi.fn(async () => ({ allowed: true })),
}))

describe('event attendance actions', () => {
  beforeEach(() => {
    payloadMock.auth.mockReset()
    payloadMock.find.mockReset()
    payloadMock.update.mockReset()
    payloadMock.findByID.mockReset()
    payloadMock.create.mockReset()
    payloadMock.db.beginTransaction.mockReset()
    payloadMock.db.commitTransaction.mockReset()
    payloadMock.db.rollbackTransaction.mockReset()
  })

  it('returns not authenticated when user is missing', async () => {
    payloadMock.auth.mockResolvedValue({ user: null })
    const { confirmAttendance } = await import('@/app/[locale]/(frontend)/events/[id]/actions')

    const result = await confirmAttendance('evt_1')

    expect(result).toEqual({ success: false, message: 'Not authenticated' })
    expect(payloadMock.find).not.toHaveBeenCalled()
  })

  it('confirms attendance when accepted registration exists', async () => {
    payloadMock.auth.mockResolvedValue({ user: { id: 7 } })
    payloadMock.find.mockResolvedValue({ totalDocs: 1, docs: [{ id: 55 }] })
    payloadMock.update.mockResolvedValue({})

    const { confirmAttendance } = await import('@/app/[locale]/(frontend)/events/[id]/actions')
    const result = await confirmAttendance('evt_2')

    expect(payloadMock.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'registrations',
      }),
    )
    expect(payloadMock.update).toHaveBeenCalledWith({
      collection: 'registrations',
      id: 55,
      data: { status: 'confirmed' },
    })
    expect(result).toEqual({ success: true, message: 'Attendance confirmed!' })
  })

  it('declines attendance for active registration', async () => {
    payloadMock.auth.mockResolvedValue({ user: { id: 8 } })
    payloadMock.find.mockResolvedValue({ totalDocs: 1, docs: [{ id: 99 }] })
    payloadMock.update.mockResolvedValue({})

    const { declineAttendance } = await import('@/app/[locale]/(frontend)/events/[id]/actions')
    const result = await declineAttendance('evt_3')

    expect(payloadMock.update).toHaveBeenCalledWith({
      collection: 'registrations',
      id: 99,
      data: { status: 'declined' },
    })
    expect(result).toEqual({ success: true, message: 'Registration declined.' })
  })

  it.each(['accepted', 'confirmed'] as const)('automatically creates a %s registration when configured', async (mode) => {
    payloadMock.auth.mockResolvedValue({ user: { id: 7 } })
    payloadMock.findByID.mockResolvedValue({ id: 4, subscription_form: 8, registration_selection_mode: mode })
    payloadMock.find.mockResolvedValue({ totalDocs: 0 })
    payloadMock.create.mockResolvedValueOnce({ id: 11 }).mockResolvedValueOnce({ id: 12 })
    payloadMock.db.beginTransaction.mockResolvedValue('tx')

    const { submitEventApplication } = await import('@/app/[locale]/(frontend)/events/[id]/actions')
    await submitEventApplication(4, { name: 'Pat' })

    expect(payloadMock.create).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'registrations',
      data: expect.objectContaining({ event: 4, user: 7, status: mode, submission: 11 }),
    }))
    expect(payloadMock.db.commitTransaction).toHaveBeenCalledWith('tx')
  })
})
