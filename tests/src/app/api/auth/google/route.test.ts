import { beforeEach, describe, expect, it, vi } from 'vitest'

const getAuthorizationUrlMock = vi.fn()
const cookieSetMock = vi.fn()

function redirectError(url: string) {
  const err = new Error('NEXT_REDIRECT') as Error & { digest?: string; url?: string }
  err.digest = `NEXT_REDIRECT;${url}`
  err.url = url
  return err
}

vi.mock('@/libs/auth/google', () => ({
  getAuthorizationUrl: getAuthorizationUrlMock,
}))
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    set: cookieSetMock,
  })),
}))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw redirectError(url)
  }),
}))

describe('GET /api/auth/google', () => {
  beforeEach(() => {
    getAuthorizationUrlMock.mockReset()
    cookieSetMock.mockReset()
  })

  it('sets PKCE/state cookies and redirects to provider URL', async () => {
    getAuthorizationUrlMock.mockResolvedValue({
      url: 'https://accounts.google.com/o/oauth2/v2/auth?x=1',
      code_verifier: 'cv-1',
      state: 'state-1',
    })

    const { GET } = await import('@/app/api/auth/google/route')

    const req = { nextUrl: new URL('http://localhost/api/auth/google') } as any

    await expect(GET(req)).rejects.toMatchObject({
      digest: expect.stringContaining('NEXT_REDIRECT'),
      url: 'https://accounts.google.com/o/oauth2/v2/auth?x=1',
    })

    expect(cookieSetMock).toHaveBeenCalledTimes(3)
    expect(cookieSetMock).toHaveBeenCalledWith(
      'code_verifier',
      'cv-1',
      expect.objectContaining({ httpOnly: true, path: '/' }),
    )
    expect(cookieSetMock).toHaveBeenCalledWith(
      'state',
      'state-1',
      expect.objectContaining({ httpOnly: true, path: '/' }),
    )
  })
})
