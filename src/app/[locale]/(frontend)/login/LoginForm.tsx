'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/i18n/client'
import { loginWithEmail } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, AlertCircle } from 'lucide-react'

export default function LoginForm({ redirectTo = '/account' }: { redirectTo?: string }) {
  const { t, locale } = useTranslation()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const result = await loginWithEmail(null, formData)

    setIsLoading(false)
    if (result.success) {
      router.push(redirectTo)
      router.refresh()
    } else {
      setError(t('nav.login_error'))
    }
  }

  return (
    <div className="flex justify-center py-5">
      {/*
        Google first and full-width: nearly every account here is a Mahidol one.
        The email form is the fallback, so it sits below the rule, not beside it.
      */}
      <div className="panel w-full max-w-[420px] p-9">
        <h1 className="type-h2 mb-2">{locale === 'th' ? 'ยินดีต้อนรับกลับ' : 'Welcome back'}</h1>
        <p className="mb-[26px] text-sm leading-relaxed text-muted-foreground">
          {locale === 'th' ? 'บัญชีมหิดลเข้าสู่ระบบด้วย Google' : 'Mahidol accounts sign in with Google.'}
        </p>

        <Button asChild size="lg" className="h-auto w-full py-[15px] text-[15px]">
          {/* A plain <a>, not next/link: Link's client-side fetch navigation
              would follow this route's redirect to accounts.google.com itself,
              and that fetch is subject to CSP connect-src (unlike a real
              top-level navigation). */}
          <a href={`/api/auth/google?redirect=${encodeURIComponent(redirectTo)}`}>
            {t('nav.signin_google')}
          </a>
        </Button>

        <div className="my-[22px] flex items-center gap-3.5">
          <span className="h-px flex-1 bg-border" />
          <span className="label-mono text-muted-foreground">{t('nav.or')}</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleEmailLogin} className="flex flex-col gap-3.5">
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="flex items-center gap-2 rounded-[10px] border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-[13px] text-secondary-foreground">
              {t('nav.email')}
            </Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password" className="text-[13px] text-secondary-foreground">
              {t('nav.password')}
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <Button
            type="submit"
            variant="outline"
            size="lg"
            className="h-auto w-full py-[15px] text-[15px]"
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('nav.signin_email')}
          </Button>
        </form>

        <p className="mt-3.5 text-xs leading-relaxed text-muted-foreground">
          {locale === 'th'
            ? 'การเข้าสู่ระบบด้วยอีเมลสำหรับบัญชีที่มีรหัสผ่านเท่านั้น'
            : 'Email login is for accounts with a password set.'}
        </p>
      </div>
    </div>
  )
}
