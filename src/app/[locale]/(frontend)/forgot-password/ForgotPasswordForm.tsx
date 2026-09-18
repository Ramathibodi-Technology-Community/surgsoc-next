'use client'

import React, { useState } from 'react'
import { useTranslation } from '@/i18n/client'
import { requestPasswordReset } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

export default function ForgotPasswordForm() {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; disabled?: boolean } | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const response = await requestPasswordReset(null, formData)

    setIsLoading(false)
    setResult(response)
  }

  return (
    <div className="flex justify-center py-5">
      <div className="panel w-full max-w-[420px] p-9">
        <h1 className="type-h2 mb-2">{t('auth.forgot_password_title')}</h1>
        <p className="mb-[26px] text-sm leading-relaxed text-muted-foreground">
          {t('auth.forgot_password_prompt')}
        </p>

        {result ? (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-[10px] border border-border bg-muted/40 p-3 text-sm"
          >
            {result.disabled ? t('auth.disabled') : t('auth.forgot_password_success')}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-[13px] text-secondary-foreground">
                {t('nav.email')}
              </Label>
              <Input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
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
              {t('auth.forgot_password_submit')}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
