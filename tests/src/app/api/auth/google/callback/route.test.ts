import { beforeEach, describe, expect, it, vi } from 'vitest'

const exchangeCodeForUserMock = vi.fn()
const validateEmailDomainMock = vi.fn()
const getPayloadMock = vi.fn()
const jwtSignMock = vi.fn()
const isProfileCompleteMock = vi.fn()

const cookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}

function redirectError(url: string) {
  const err = new Error('NEXT_REDIRECT') as Error & { digest?: string; url?: string }
  err.digest = `NEXT_REDIRECT;${url}`
  err.url = url
  return err
}

vi.mock('@/libs/auth/google', () => ({
  exchangeCodeForUser: exchangeCodeForUserMock,
}))
vi.mock('@/libs/auth/email-domain', () => ({
  validateEmailDomain: validateEmailDomainMock,
}))
vi.mock('payload', () => ({
  getPayload: getPayloadMock,
  jwtSign: jwtSignMock,
}))
vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => cookieStore),
}))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw redirectError(url)
  }),
}))
vi.mock('@/libs/profile-completion', () => ({
  isProfileComplete: isProfileCompleteMock,
}))

describe('GET /api/auth/google/callback', () => {
  beforeEach(() => {
    exchangeCodeForUserMock.mockReset()
    validateEmailDomainMock.mockReset()
    getPayloadMock.mockReset()
    jwtSignMock.mockReset()
    isProfileCompleteMock.mockReset()
    cookieStore.get.mockReset()
    cookieStore.set.mockReset()
    cookieStore.delete.mockReset()
  })

  it('redirects with missing_params when code/state are absent', async () => {
    const { GET } = await import('@/app/api/auth/google/callback/route')

    await expect(GET(new Request('http://localhost/api/auth/google/callback'))).rejects.toMatchObject({
      url: '/login?error=missing_params',
    })
  })

  it('redirects with invalid_domain when email domain is rejected', async () => {
    cookieStore.get.mockImplementation((name: string) => {
      if (name === 'code_verifier') return { value: 'cv' }
      if (name === 'state') return { value: 'st' }
      return undefined
    })

    exchangeCodeForUserMock.mockResolvedValue({
      email: 'user@example.com',
      sub: 'google-sub',
      email_verified: true,
    })
    validateEmailDomainMock.mockReturnValue(false)

    const { GET } = await import('@/app/api/auth/google/callback/route')

    await expect(
      GET(new Request('http://localhost/api/auth/google/callback?code=abc&state=st')),
    ).rejects.toMatchObject({ url: '/login?error=invalid_domain' })
  })

  it('redirects with no_email when Google email_verified is false or missing', async () => {
    cookieStore.get.mockImplementation((name: string) => {
      if (name === 'code_verifier') return { value: 'cv' }
      if (name === 'state') return { value: 'st' }
      return undefined
    })

    const { GET } = await import('@/app/api/auth/google/callback/route')

    exchangeCodeForUserMock.mockResolvedValueOnce({
      email: 'user@example.com',
      sub: 'google-sub',
      email_verified: false,
    })
    await expect(
      GET(new Request('http://localhost/api/auth/google/callback?code=abc&state=st')),
    ).rejects.toMatchObject({ url: '/login?error=no_email' })

    exchangeCodeForUserMock.mockResolvedValueOnce({
      email: 'user@example.com',
      sub: 'google-sub',
    })
    await expect(
      GET(new Request('http://localhost/api/auth/google/callback?code=abc&state=st')),
    ).rejects.toMatchObject({ url: '/login?error=no_email' })

    expect(validateEmailDomainMock).not.toHaveBeenCalled()
  })

  it('sets auth cookie and redirects to profile completion for incomplete profile', async () => {
    cookieStore.get.mockImplementation((name: string) => {
      if (name === 'code_verifier') return { value: 'cv' }
      if (name === 'state') return { value: 'st' }
      return undefined
    })

    exchangeCodeForUserMock.mockResolvedValue({
      email: 'member@mahidol.edu',
      sub: 'google-sub',
      email_verified: true,
      picture: 'https://example.com/avatar.png',
      given_name: 'Mina',
      family_name: 'Lee',
    })
    validateEmailDomainMock.mockReturnValue(true)

    const payloadMock = {
      secret: 'secret',
      collections: {
        users: { config: { auth: { tokenExpiration: 3600 } } },
      },
      find: vi
        .fn()
        .mockResolvedValueOnce({ docs: [] })
        .mockResolvedValueOnce({ docs: [{ id: 7, email: 'member@mahidol.edu' }] }),
      update: vi.fn().mockResolvedValue({}),
      create: vi.fn(),
    }
    getPayloadMock.mockResolvedValue(payloadMock)

    jwtSignMock.mockResolvedValue({ token: 'signed-token' })
    isProfileCompleteMock.mockReturnValue(false)

    const { GET } = await import('@/app/api/auth/google/callback/route')

    await expect(
      GET(new Request('http://localhost/api/auth/google/callback?code=abc&state=st')),
    ).rejects.toMatchObject({ url: '/account?complete=true' })

    expect(cookieStore.set).toHaveBeenCalledWith(
      'payload-token',
      'signed-token',
      expect.objectContaining({ httpOnly: true, path: '/' }),
    )
    expect(cookieStore.delete).toHaveBeenCalledWith('code_verifier')
    expect(cookieStore.delete).toHaveBeenCalledWith('state')
  })
})
