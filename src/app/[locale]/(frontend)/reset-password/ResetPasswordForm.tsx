'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/i18n/client'
import { resetPassword, type ResetPasswordState } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, AlertCircle } from 'lucide-react'

export default function ResetPasswordForm({ token }: { token?: string }) {
  const { t } = useTranslation()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<ResetPasswordState['error'] | null>(token ? null : 'missing_token')

  const errorMessage = (code: ResetPasswordState['error']) => {
    switch (code) {
      case 'missing_token':
        return t('auth.reset_password_missing_token')
      case 'mismatch':
        return t('auth.reset_password_mismatch')
      default:
        return t('auth.reset_password_error')
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!token) return
    setIsLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const result = await resetPassword(null, formData)

    setIsLoading(false)
    if (result.success) {
      router.push('/login')
    } else {
      setError(result.error ?? 'error')
    }
  }

  return (
    <div className="flex justify-center py-5">
      <div className="panel w-full max-w-[420px] p-9">
        <h1 className="type-h2 mb-2">{t('auth.reset_password_title')}</h1>

        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-3.5 flex items-center gap-2 rounded-[10px] border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {errorMessage(error)}
          </div>
        )}

        {token && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <input type="hidden" name="token" value={token} />

            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-[13px] text-secondary-foreground">
                {t('auth.new_password')}
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword" className="text-[13px] text-secondary-foreground">
                {t('auth.confirm_password')}
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                required
                autoComplete="new-password"
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
              {t('auth.reset_password_submit')}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
