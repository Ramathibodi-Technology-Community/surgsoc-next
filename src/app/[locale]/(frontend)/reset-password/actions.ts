'use server'

import { getPayload } from 'payload'
import config from '@payload-config'

export type ResetPasswordState = {
  success: boolean
  error?: 'missing_token' | 'mismatch' | 'error'
}

export async function resetPassword(
  _prevState: ResetPasswordState | null,
  formData: FormData,
): Promise<ResetPasswordState> {
  const token = formData.get('token') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!token) {
    return { success: false, error: 'missing_token' }
  }

  if (!password || password !== confirmPassword) {
    return { success: false, error: 'mismatch' }
  }

  try {
    const payload = await getPayload({ config })
    const result = await payload.resetPassword({
      collection: 'users',
      data: { token, password },
      overrideAccess: true,
    })

    if (!result?.token) {
      return { success: false, error: 'error' }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Reset password error:', error?.message || error)
    return { success: false, error: 'error' }
  }
}
