import React from 'react'
import type { Metadata } from 'next'
import ForgotPasswordForm from './ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'Reset Password | RASS',
  description: 'Request a password reset link.',
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />
}
