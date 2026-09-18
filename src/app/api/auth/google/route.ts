import { getAuthorizationUrl } from '@/libs/auth/google'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { safeRedirectPath } from '@/libs/utils'
import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const { url, code_verifier, state } = await getAuthorizationUrl()

  const cookieStore = await cookies()

  // Carry the post-login destination across the OAuth round-trip.
  cookieStore.set(
    'post_login_redirect',
    safeRedirectPath(req.nextUrl.searchParams.get('redirect')),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 10, // 10 minutes
    },
  )

  // Security cookies for PKCE & CSRF
  cookieStore.set('code_verifier', code_verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10, // 10 minutes
  })

  cookieStore.set('state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10, // 10 minutes
  })

  redirect(url)
}
