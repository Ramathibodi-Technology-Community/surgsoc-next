'use server'

import { getPayload } from 'payload'
import config from '@payload-config'

// Matches the message thrown by the beforeOperation gate in src/collections/Users.ts.
const DISABLED_MESSAGE = 'Password reset is currently disabled. Please contact an administrator.'

export async function requestPasswordReset(
  _prevState: { success: boolean; disabled?: boolean } | null,
  formData: FormData,
): Promise<{ success: boolean; disabled?: boolean }> {
  const email = formData.get('email') as string

  if (!email) {
    return { success: false }
  }

  try {
    const payload = await getPayload({ config })
    await payload.forgotPassword({
      collection: 'users',
      data: { email },
    })
  } catch (error: any) {
    if (error?.message === DISABLED_MESSAGE) {
      return { success: false, disabled: true }
    }
    // Any other error (unknown email included) must look identical to success —
    // never leak whether an account exists.
    console.error('Forgot password error:', error?.message || error)
  }

  return { success: true }
}
