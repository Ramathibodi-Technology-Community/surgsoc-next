import { beforeEach, describe, expect, it, vi } from 'vitest'

const payloadMock = {
  auth: vi.fn(),
  find: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}

vi.mock('payload', () => ({ getPayload: vi.fn(async () => payloadMock) }))
vi.mock('next/headers', () => ({ headers: vi.fn(async () => ({})) }))

const state = { ok: true, message: '', details: [], stats: {} }

const form = (entityType: string, payloadText = '[]') => {
  const data = new FormData()
  data.set('entityType', entityType)
  data.set('inputFormat', 'json')
  data.set('payloadText', payloadText)
  return data
}

describe('data import authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    payloadMock.find.mockResolvedValue({ docs: [], totalDocs: 0 })
  })

  it('requires the permission for the imported entity', async () => {
    payloadMock.auth.mockResolvedValue({
      user: {
        id: 1,
        roles: ['staff'],
        groups: [{ slug: 'users', permissions: { manage_users: true } }],
      },
    })
    const { validateDataAction } = await import('@/app/(payload)/admin/data-import/actions')

    const result = await validateDataAction(state, form('events'))

    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/Unauthorized/i)
  })

  it('blocks non-superadmins from importing admin roles', async () => {
    payloadMock.auth.mockResolvedValue({
      user: {
        id: 1,
        roles: ['staff'],
        groups: [{ slug: 'users', permissions: { manage_users: true } }],
      },
    })
    const { validateDataAction } = await import('@/app/(payload)/admin/data-import/actions')

    const result = await validateDataAction(
      state,
      form('users', JSON.stringify([{ email: 'new@example.com', roles: ['admin'] }])),
    )

    expect(result.ok).toBe(false)
    expect(result.details).toContain('users row 1: only superadmins can import admin roles.')
  })

  it('rejects oversized import text before parsing it', async () => {
    payloadMock.auth.mockResolvedValue({
      user: {
        id: 1,
        roles: ['staff'],
        groups: [{ slug: 'events', permissions: { manage_events: true } }],
      },
    })
    const { validateDataAction } = await import('@/app/(payload)/admin/data-import/actions')

    const result = await validateDataAction(state, form('events', 'x'.repeat(5 * 1024 * 1024 + 1)))

    expect(result.ok).toBe(false)
    expect(result.message).toContain('5 MB limit')
  })

  it('never imports passwords, OAuth identities, or direct group grants', async () => {
    payloadMock.auth.mockResolvedValue({ user: { id: 1, roles: ['superadmin'], groups: [] } })
    payloadMock.find.mockImplementation(async ({ collection }) => {
      if (collection === 'users') {
        return {
          docs: [{ id: 7, email: 'member@example.com', roles: ['visitor'], groups: [] }],
          totalDocs: 1,
        }
      }
      return { docs: [], totalDocs: 0 }
    })
    payloadMock.update.mockResolvedValue({})
    const { importDataAction } = await import('@/app/(payload)/admin/data-import/actions')

    const result = await importDataAction(
      state,
      form('users', JSON.stringify([{
        email: 'member@example.com',
        roles: ['visitor'],
        password: 'attacker-chosen',
        google_id: 'attacker-google-id',
        groups: [99],
      }])),
    )

    expect(result.ok).toBe(true)
    expect(payloadMock.update).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'users',
      id: 7,
    }))
    const written = payloadMock.update.mock.calls[0][0].data
    expect(written).not.toHaveProperty('password')
    expect(written).not.toHaveProperty('google_id')
    expect(written).not.toHaveProperty('groups')
  })
})
