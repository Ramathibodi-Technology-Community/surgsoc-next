import { beforeEach, describe, expect, it, vi } from 'vitest'

const payloadMock = {
  auth: vi.fn(),
  find: vi.fn(),
  logger: { error: vi.fn() },
}

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({
  getPayload: vi.fn(async () => payloadMock),
}))
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({ mocked: true })),
}))

describe('POST /api/admin/export', () => {
  beforeEach(() => {
    payloadMock.auth.mockReset()
    payloadMock.find.mockReset()
    payloadMock.logger.error.mockReset()
  })

  it('returns 403 for unauthorized users', async () => {
    payloadMock.auth.mockResolvedValue({ user: null })
    const { POST } = await import('@/app/api/admin/export/route')

    const req = new Request('http://localhost/api/admin/export', {
      method: 'POST',
      body: JSON.stringify({ collection: 'users' }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req as any)
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
  })

  it('uses export_data rather than a job-title role', async () => {
    const { POST } = await import('@/app/api/admin/export/route')
    const request = () => new Request('http://localhost/api/admin/export', {
      method: 'POST',
      body: JSON.stringify({ collection: 'events' }),
      headers: { 'content-type': 'application/json' },
    })

    payloadMock.auth.mockResolvedValue({ user: { id: 2, roles: ['vp'], groups: [] } })
    expect((await POST(request() as any)).status).toBe(403)

    payloadMock.auth.mockResolvedValue({
      user: {
        id: 3,
        roles: ['staff'],
        groups: [{ slug: 'data', permissions: { export_data: true } }],
      },
    })
    expect((await POST(request() as any)).status).toBe(400)
  })

  it('returns 400 for invalid collection', async () => {
    payloadMock.auth.mockResolvedValue({ user: { id: 1, roles: ['admin'] } })
    const { POST } = await import('@/app/api/admin/export/route')

    const req = new Request('http://localhost/api/admin/export', {
      method: 'POST',
      body: JSON.stringify({ collection: 'events' }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req as any)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid collection' })
  })

  it('exports users as CSV content', async () => {
    payloadMock.auth.mockResolvedValue({ user: { id: 1, roles: ['admin'] } })
    payloadMock.find.mockResolvedValue({
      docs: [
        {
          id: 7,
          name_thai: { first_name: 'สมชาย', last_name: 'ใจดี', nickname: 'ชาย' },
          email: 'member@mahidol.edu',
          contact: { phone: '0812345678' },
          department: 'OD',
          roles: ['member', 'staff'],
        },
      ],
    })

    const { POST } = await import('@/app/api/admin/export/route')

    const req = new Request('http://localhost/api/admin/export', {
      method: 'POST',
      body: JSON.stringify({ collection: 'users', filters: { role: 'member' } }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req as any)
    const text = await res.text()

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/csv')
    expect(res.headers.get('content-disposition')).toContain('users-export-')
    expect(text).toContain('ID,Full Name (TH),Nickname (TH),Email,Phone,Department,Roles')
    expect(text).toContain('member@mahidol.edu')
  })

  it('returns 400 when registrations export has no eventId', async () => {
    payloadMock.auth.mockResolvedValue({ user: { id: 1, roles: ['admin'] } })
    const { POST } = await import('@/app/api/admin/export/route')

    const req = new Request('http://localhost/api/admin/export', {
      method: 'POST',
      body: JSON.stringify({ collection: 'registrations', filters: {} }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req as any)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Event ID required for registration export' })
  })
})
