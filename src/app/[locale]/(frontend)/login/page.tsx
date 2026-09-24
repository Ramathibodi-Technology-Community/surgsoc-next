import React from 'react'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/libs/auth/current-user'
import { redirect } from 'next/navigation'
import LoginForm from './LoginForm'
import { safeRedirectPath } from '@/libs/utils'

export const metadata: Metadata = {
  title: 'Login | RASS',
  description: 'Sign in to your Ramathibodi Surgical Society account.',
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ redirect?: string }>
}) {
  const { locale } = await params
  const redirectTo = safeRedirectPath((await searchParams).redirect)
  const payload = await getPayload({ config })
  const user = await getCurrentUser(payload)

  if (user) {
    redirect(redirectTo)
  }

  return <LoginForm redirectTo={redirectTo} />
}
