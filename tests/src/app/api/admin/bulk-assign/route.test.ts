import { beforeEach, describe, expect, it, vi } from 'vitest'

const payloadMock = {
  auth: vi.fn(),
  find: vi.fn(),
  findByID: vi.fn(),
  update: vi.fn(),
  logger: { error: vi.fn() },
}

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({
  getPayload: vi.fn(async () => payloadMock),
}))
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({ mocked: true })),
}))

describe('POST /api/admin/bulk-assign', () => {
  beforeEach(() => {
    payloadMock.auth.mockReset()
    payloadMock.find.mockReset()
    payloadMock.findByID.mockReset()
    payloadMock.update.mockReset()
    payloadMock.logger.error.mockReset()
  })

  it('returns 403 when user is unauthorized', async () => {
    payloadMock.auth.mockResolvedValue({ user: null })
    const { POST } = await import('@/app/api/admin/bulk-assign/route')

    const req = new Request('http://localhost/api/admin/bulk-assign', {
      method: 'POST',
      body: JSON.stringify({ mode: 'all', groupId: 'g1' }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req as any)
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
  })

  it('returns 400 when groupId is missing', async () => {
    payloadMock.auth.mockResolvedValue({ user: { id: 1, roles: ['admin'] } })
    const { POST } = await import('@/app/api/admin/bulk-assign/route')

    const req = new Request('http://localhost/api/admin/bulk-assign', {
      method: 'POST',
      body: JSON.stringify({ mode: 'all' }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req as any)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Missing Group ID' })
  })

  it('returns 400 when mode is invalid', async () => {
    payloadMock.auth.mockResolvedValue({ user: { id: 1, roles: ['admin'] } })
    const { POST } = await import('@/app/api/admin/bulk-assign/route')

    const req = new Request('http://localhost/api/admin/bulk-assign', {
      method: 'POST',
      body: JSON.stringify({ mode: 'everyone', groupId: 'g1' }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req as any)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Invalid mode' })
    expect(payloadMock.findByID).not.toHaveBeenCalled()
  })

  it('keeps a group lookup failure as a server error', async () => {
    payloadMock.auth.mockResolvedValue({ user: { id: 1, roles: ['admin'] } })
    payloadMock.findByID.mockRejectedValue(new Error('database unavailable'))
    const { POST } = await import('@/app/api/admin/bulk-assign/route')

    const req = new Request('http://localhost/api/admin/bulk-assign', {
      method: 'POST',
      body: JSON.stringify({ mode: 'all', groupId: 'g1' }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req as any)
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Internal Server Error' })
  })

  it('assigns group only to users missing it', async () => {
    payloadMock.auth.mockResolvedValue({ user: { id: 1, roles: ['admin'] } })
    payloadMock.findByID.mockResolvedValue({ id: 'g1', slug: 'dept-ia', permissions: {} })
    // Single batched find call returns both users at once (no more N+1)
    payloadMock.find.mockResolvedValue({
      docs: [
        { id: 'u1', groups: ['g1'] },
        { id: 'u2', groups: ['g0'] },
      ],
    })
    payloadMock.update.mockResolvedValue({})

    const { POST } = await import('@/app/api/admin/bulk-assign/route')

    const req = new Request('http://localhost/api/admin/bulk-assign', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'selected',
        groupId: 'g1',
        userIds: ['u1', 'u2'],
      }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req as any)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(payloadMock.find).toHaveBeenCalledTimes(1)
    expect(payloadMock.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'users',
        where: { id: { in: ['u1', 'u2'] } },
      }),
    )
    expect(payloadMock.update).toHaveBeenCalledTimes(1)
    expect(payloadMock.update).toHaveBeenCalledWith({
      collection: 'users',
      id: 'u2',
      data: { groups: ['g0', 'g1'] },
      context: { skipGroupSync: true },
    })
    expect(body).toMatchObject({
      success: true,
      count: 1,
      skipped: 1,
      failedIds: [],
    })
  })

  /*
    Year and track became filters here when their groups were removed. The
    filter is the only thing bounding a write to up to 1000 users, so an id
    that does not belong to the named vocabulary has to 400 rather than be
    dropped — a dropped filter means "assign to everyone".
  */
  describe('taxonomy filters', () => {
    const TAGS: Record<string, { id: number }[]> = {
      department: [{ id: 41 }],
      year: [{ id: 21 }],
      track: [{ id: 11 }],
    }

    // findTags sends { and: [{ kind: { equals } }, ...] }; users send anything else.
    const kindAwareFind = ({ collection, where }: any) => {
      if (collection === 'tags') {
        const kind = where.and[0].kind.equals
        return Promise.resolve({ docs: TAGS[kind] ?? [] })
      }
      return Promise.resolve({ docs: [] })
    }

    const post = async (filters: Record<string, unknown>) => {
      payloadMock.auth.mockResolvedValue({ user: { id: 1, roles: ['admin'] } })
      payloadMock.findByID.mockResolvedValue({ id: 'g1', slug: 'dept-ia', permissions: {} })
      payloadMock.find.mockImplementation(kindAwareFind)

      const { POST } = await import('@/app/api/admin/bulk-assign/route')
      const req = new Request('http://localhost/api/admin/bulk-assign', {
        method: 'POST',
        body: JSON.stringify({ mode: 'all', groupId: 'g1', filters }),
        headers: { 'content-type': 'application/json' },
      })
      return POST(req as any)
    }

    it('matches a year tag on the user field rather than a group', async () => {
      await post({ year: 21 })

      expect(payloadMock.find).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'users',
          where: { 'academic.year': { equals: 21 } },
        }),
      )
    })

    it('rejects an id that is not in the vocabulary', async () => {
      const res = await post({ year: 999 })

      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'Unknown year filter' })
    })

    it('rejects a real tag id borrowed from another vocabulary', async () => {
      // 41 is a department. Accepting it as a year would widen the write to
      // every user, since no user's academic.year can equal a department tag.
      const res = await post({ year: 41 })

      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'Unknown year filter' })
    })

    it('applies department, year and track together', async () => {
      await post({ department: 41, year: 21, track: 11 })

      expect(payloadMock.find).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'users',
          where: {
            department: { equals: 41 },
            'academic.year': { equals: 21 },
            'academic.track': { equals: 11 },
          },
        }),
      )
    })
  })
})
