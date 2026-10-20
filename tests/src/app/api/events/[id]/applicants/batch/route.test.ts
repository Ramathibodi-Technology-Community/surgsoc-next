vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
import { beforeEach, describe, expect, it, vi } from 'vitest'

const payloadMock = {
  auth: vi.fn(),
  count: vi.fn(),
  findByID: vi.fn(),
  find: vi.fn(),
  update: vi.fn(),
  logger: { error: vi.fn() },
  db: { beginTransaction: vi.fn(), commitTransaction: vi.fn(), rollbackTransaction: vi.fn(), sessions: { tx: { db: { execute: vi.fn() } } } },
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

describe('POST /api/events/[id]/applicants/batch', () => {
  beforeEach(() => {
    payloadMock.db.beginTransaction.mockResolvedValue('tx')
    payloadMock.count.mockResolvedValue({ totalDocs: 0 })
    payloadMock.auth.mockReset()
    payloadMock.findByID.mockReset()
    payloadMock.find.mockReset()
    payloadMock.update.mockReset()
    payloadMock.logger.error.mockReset()
    hasPermissionMock.mockReset()
  })

  it('returns 401 when user is not authenticated', async () => {
    payloadMock.auth.mockResolvedValue({ user: null })
    const { POST } = await import('@/app/api/events/[id]/applicants/batch/route')

    const req = new Request('http://localhost/api/events/1/applicants/batch', {
      method: 'POST',
      body: JSON.stringify({ action: 'accept', registrationIds: [1] }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: '1' }) })
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
  })

  it('returns 403 when user is not owner and lacks permission', async () => {
    payloadMock.auth.mockResolvedValue({ user: { id: 9 } })
    payloadMock.findByID.mockResolvedValue({ id: '1', owner: 1 })
    hasPermissionMock.mockReturnValue(false)

    const { POST } = await import('@/app/api/events/[id]/applicants/batch/route')

    const req = new Request('http://localhost/api/events/1/applicants/batch', {
      method: 'POST',
      body: JSON.stringify({ action: 'accept', registrationIds: [1] }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: '1' }) })
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Forbidden' })
  })

  it('rejects the batch when registrationIds belong to a different event', async () => {
    payloadMock.auth.mockResolvedValue({ user: { id: 5 } })
    payloadMock.findByID.mockResolvedValue({ id: '2', owner: 5 })
    hasPermissionMock.mockReturnValue(false)
    // Only 1 of 2 ids actually belongs to the event
    payloadMock.find.mockResolvedValue({ docs: [{ id: 101, event: '2' }] })

    const { POST } = await import('@/app/api/events/[id]/applicants/batch/route')

    const req = new Request('http://localhost/api/events/2/applicants/batch', {
      method: 'POST',
      body: JSON.stringify({ action: 'accept', registrationIds: [101, 999] }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: '2' }) })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/do not belong/i)
    expect(body.mismatchedIds).toEqual([999])
    expect(payloadMock.update).not.toHaveBeenCalled()
  })

  it('updates registrations and returns count on success', async () => {
    payloadMock.auth.mockResolvedValue({ user: { id: 5 } })
    payloadMock.findByID.mockResolvedValue({ id: '2', owner: 5 })
    hasPermissionMock.mockReturnValue(false)
    payloadMock.find.mockResolvedValue({
      docs: [
        { id: 101, event: '2', status: 'applicant', submission: { id: 1 } },
        { id: 102, event: '2', status: 'subscribed', submission: { id: 2 } },
      ],
    })
    payloadMock.update.mockResolvedValue({})

    const { POST } = await import('@/app/api/events/[id]/applicants/batch/route')

    const req = new Request('http://localhost/api/events/2/applicants/batch', {
      method: 'POST',
      body: JSON.stringify({ action: 'accept', registrationIds: [101, 102] }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: '2' }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(payloadMock.update).toHaveBeenCalledTimes(2)
    expect(payloadMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'registrations',
        id: 101,
        data: expect.objectContaining({
          status: 'accepted',
          selected_by: 5,
        }),
      }),
    )
    expect(body).toMatchObject({ success: true, updated: 2, failedIds: [] })
  })

  it('uses rejected status when action is reject', async () => {
    payloadMock.auth.mockResolvedValue({ user: { id: 6 } })
    payloadMock.findByID.mockResolvedValue({ id: '3', owner: 6 })
    payloadMock.find.mockResolvedValue({ docs: [{ id: 201, event: '3', status: 'applicant' }] })
    payloadMock.update.mockResolvedValue({})

    const { POST } = await import('@/app/api/events/[id]/applicants/batch/route')

    const req = new Request('http://localhost/api/events/3/applicants/batch', {
      method: 'POST',
      body: JSON.stringify({ action: 'reject', registrationIds: [201] }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: '3' }) })
    expect(res.status).toBe(200)
    expect(payloadMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'rejected' }),
      }),
    )
  })

  it('rejects invalid action values', async () => {
    payloadMock.auth.mockResolvedValue({ user: { id: 6 } })

    const { POST } = await import('@/app/api/events/[id]/applicants/batch/route')

    const req = new Request('http://localhost/api/events/3/applicants/batch', {
      method: 'POST',
      body: JSON.stringify({ action: 'delete', registrationIds: [1] }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: '3' }) })
    expect(res.status).toBe(400)
    expect(payloadMock.update).not.toHaveBeenCalled()
  })

  it('refuses to flip registrations the attendee already resolved', async () => {
    payloadMock.auth.mockResolvedValue({ user: { id: 5 } })
    payloadMock.findByID.mockResolvedValue({ id: '4', owner: 5 })
    hasPermissionMock.mockReturnValue(false)
    payloadMock.find.mockResolvedValue({
      docs: [
        { id: 301, event: '4', status: 'applicant', submission: { id: 1 } },
        { id: 302, event: '4', status: 'declined' },
      ],
    })

    const { POST } = await import('@/app/api/events/[id]/applicants/batch/route')
    const req = new Request('http://localhost/api/events/4/applicants/batch', {
      method: 'POST',
      body: JSON.stringify({ action: 'accept', registrationIds: [301, 302] }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req, { params: Promise.resolve({ id: '4' }) })
    expect(res.status).toBe(400)
    expect((await res.json()).lockedIds).toEqual([302])
    expect(payloadMock.update).not.toHaveBeenCalled()
  })
})
