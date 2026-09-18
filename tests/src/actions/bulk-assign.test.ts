import { beforeEach, describe, expect, it, vi } from 'vitest'

const payloadMock = {
  auth: vi.fn(),
  find: vi.fn(),
  create: vi.fn(),
}

const hasPermissionMock = vi.fn()

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({
  getPayload: vi.fn(async () => payloadMock),
}))
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({ mocked: true })),
}))
vi.mock('@/libs/permissions', () => ({
  hasPermission: hasPermissionMock,
}))

describe('bulkAssignForm action', () => {
  beforeEach(() => {
    payloadMock.auth.mockReset()
    payloadMock.find.mockReset()
    payloadMock.create.mockReset()
    hasPermissionMock.mockReset()
  })

  it('returns unauthorized when no user exists', async () => {
    payloadMock.auth.mockResolvedValue({ user: null })
    const { bulkAssignForm } = await import('@/actions/bulk-assign')

    const result = await bulkAssignForm(1, 'all')
    expect(result).toEqual({ success: false, message: 'Unauthorized' })
  })

  it('returns permission error when user lacks rights', async () => {
    payloadMock.auth.mockResolvedValue({ user: { id: 2 } })
    hasPermissionMock.mockReturnValue(false)
    const { bulkAssignForm } = await import('@/actions/bulk-assign')

    const result = await bulkAssignForm(1, 'all')
    expect(result).toEqual({ success: false, message: 'Insufficient permissions' })
  })

  it('assigns only users that do not already have assignment', async () => {
    payloadMock.auth.mockResolvedValue({ user: { id: 3 } })
    hasPermissionMock.mockReturnValue(true)
    payloadMock.find
      .mockResolvedValueOnce({ totalDocs: 2, docs: [{ id: 101 }, { id: 102 }] })
      .mockResolvedValueOnce({ totalDocs: 1, docs: [{ user: 101 }] })
    payloadMock.create.mockResolvedValue({})

    const { bulkAssignForm } = await import('@/actions/bulk-assign')

    const result = await bulkAssignForm('22', 'all')

    expect(payloadMock.create).toHaveBeenCalledTimes(1)
    expect(payloadMock.create).toHaveBeenCalledWith({
      collection: 'form-assignments',
      data: {
        user: 102,
        form: 22,
        completed: false,
        assigned_by: 3,
      },
    })
    expect(result).toEqual({
      success: true,
      message: 'Successfully assigned form to 1 users',
      count: 1,
    })
  })
})
