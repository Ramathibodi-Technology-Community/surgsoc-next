import { beforeEach, describe, expect, it, vi } from 'vitest'

const payloadMock = {
  login: vi.fn(),
  collections: {
    users: {
      config: {
        auth: { tokenExpiration: 28800 },
      },
    },
  },
}

const cookieSetMock = vi.fn()

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({
  getPayload: vi.fn(async () => payloadMock),
}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    set: cookieSetMock,
  })),
}))

describe('loginWithEmail action', () => {
  beforeEach(() => {
    payloadMock.login.mockReset()
    cookieSetMock.mockReset()
  })

  it('returns validation error when email/password are missing', async () => {
    const { loginWithEmail } = await import('@/app/[locale]/(frontend)/login/actions')
    const formData = new FormData()

    const result = await loginWithEmail(null, formData)
    expect(result).toEqual({ success: false, message: 'Email and password are required.' })
  })

  it('sets auth cookie on successful login', async () => {
    payloadMock.login.mockResolvedValue({ token: 'token-123' })
    const { loginWithEmail } = await import('@/app/[locale]/(frontend)/login/actions')
    const formData = new FormData()
    formData.set('email', 'member@example.com')
    formData.set('password', 'secret')

    const result = await loginWithEmail(null, formData)

    expect(result).toEqual({ success: true, message: 'Login successful' })
    expect(cookieSetMock).toHaveBeenCalledWith(
      'payload-token',
      'token-123',
      expect.objectContaining({
        httpOnly: true,
        path: '/',
      }),
    )
  })

  it('returns invalid credentials when login has no token', async () => {
    payloadMock.login.mockResolvedValue({ token: undefined })
    const { loginWithEmail } = await import('@/app/[locale]/(frontend)/login/actions')
    const formData = new FormData()
    formData.set('email', 'member@example.com')
    formData.set('password', 'bad')

    const result = await loginWithEmail(null, formData)

    expect(result).toEqual({ success: false, message: 'Invalid email or password.' })
  })
})
