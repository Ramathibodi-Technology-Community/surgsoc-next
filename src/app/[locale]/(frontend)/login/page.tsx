import React from 'react'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'
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
  const headersList = await headers()
  const { user } = await payload.auth({ headers: headersList })

  if (user) {
    redirect(redirectTo)
  }

  return <LoginForm redirectTo={redirectTo} />
}
