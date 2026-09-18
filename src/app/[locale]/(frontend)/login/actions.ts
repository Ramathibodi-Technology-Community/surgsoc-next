'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { cookies } from 'next/headers'

export async function loginWithEmail(
  _prevState: { success: boolean; message: string } | null,
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { success: false, message: 'Email and password are required.' }
  }

  try {
    const payload = await getPayload({ config })

    const result = await payload.login({
      collection: 'users',
      data: { email, password },
    })

    if (result.token) {
      // Set the auth cookie so subsequent requests are authenticated.
      // Cookie lifetime must match the JWT's tokenExpiration so the browser
      // doesn't keep sending a cookie wrapping an already-expired token.
      const cookieStore = await cookies()
      const tokenExpiration =
        payload.collections['users'].config.auth.tokenExpiration ?? 60 * 60 * 24 * 7
      cookieStore.set('payload-token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        sameSite: 'lax',
        maxAge: tokenExpiration,
      })

      return { success: true, message: 'Login successful' }
    }

    return { success: false, message: 'Invalid email or password.' }
  } catch (error: any) {
    console.error('Email login error:', error?.message || error)
    return { success: false, message: 'Invalid email or password.' }
  }
}
