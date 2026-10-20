'use client'

import React, { useCallback, useState } from 'react'
import type { Form as FormType } from '@payloadcms/plugin-form-builder/types'
import FormField from './FormField'
import StatusMark from './StatusMark'
import { Button } from './ui/button'
import { Loader2 } from 'lucide-react'
import { prefillFormData } from '@/libs/forms/prefillUserData'
import { getHiddenFields } from '@/libs/forms/conditionalLogic'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { useTranslation } from '@/i18n/client'

interface Props {
  form: FormType
  onSubmit: (data: Record<string, unknown>) => Promise<void>
  preview?: boolean
  children?: React.ReactNode
  user?: any
}

export default function PayloadForm({ form, onSubmit, user, preview = false, children }: Props) {
  const { t } = useTranslation()
  // Prefill is a pure function of the user + field list, so it only needs to
  // run once as the initial state, not re-sync in an effect on every render
  // where `form.fields` gets a fresh object identity (which would overwrite
  // whatever the user has since typed).
  const [formData, setFormData] = useState<Record<string, unknown>>(() =>
    form.fields ? prefillFormData(user, form.fields) : {}
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (preview) return
    setIsSubmitting(true)
    setError(null)
    try {
      await onSubmit(formData)
      // "Go to a link" on the After sending tab: members leave for the link instead of seeing the message.
      const redirectUrl = (form as { confirmationType?: string; redirect?: { url?: string } }).confirmationType === 'redirect' ? (form as { redirect?: { url?: string } }).redirect?.url : null
      if (redirectUrl) { window.location.assign(redirectUrl); return }
      setSuccess(true)
      setFormData({})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    }
    setIsSubmitting(false)
  }, [formData, onSubmit, preview])

  /*
    Offering "Submit another response" on a single-submission form is an
    affordance that cannot be honoured — the page that hosts this component
    already blocks the second attempt, so the link only leads back to a refusal.
  */
  const allowMultiple =
    (form as { publish?: { allow_multiple_submissions?: boolean } }).publish
      ?.allow_multiple_submissions === true

  if (success) {
      /*
        Inline and persistent, because a submitted response is a record state
        the reader may need to act on later — not a toast that evaporates.

        It does not say "Success!". The old fallback did, in bold, above a line
        that then said the same thing again in plain words. A confirmation
        states what is now on record; the exclamation adds nothing the check
        mark has not already carried.
      */
      const confirmation = form.confirmationMessage

      return (
          <div className="rounded-md border border-success/30 bg-success/10 p-6">
              <StatusMark status="complete" label="Submitted" className="mb-3" />
              {confirmation?.root?.children?.length ? (
                <RichText className="max-w-[52ch] leading-relaxed text-secondary-foreground" data={confirmation} />
              ) : (
                <p className="max-w-[52ch] leading-relaxed text-secondary-foreground">Your response is recorded.</p>
              )}
              {allowMultiple && (
                <button
                  type="button"
                  onClick={() => setSuccess(false)}
                  className="mt-4 text-meta font-medium text-accent transition-colors hover:text-accent/80"
                >
                  Submit another response
                </button>
              )}
          </div>
      )
  }

  const hiddenFields = getHiddenFields(form.fields || [], formData)
  const Container = preview ? 'div' : 'form'

  return (
    <Container onSubmit={handleSubmit} className="space-y-6">
      {children}
      <fieldset disabled={preview} className="space-y-6">
      {form.fields?.map((field, i) => {
        const fieldName = (field as { name?: string }).name
        if (fieldName && hiddenFields.has(fieldName)) {
            return null
        }

        return (
            <FormField
                key={i}
                field={field}
                value={formData[(field as { name?: string }).name ?? '']}
                onChange={(v) => setFormData(prev => ({ ...prev, [(field as { name?: string }).name ?? '']: v }))}
                user={user}
                rankingHint={t('forms.ranking_hint')}
            />
        )
      })}
      </fieldset>
      {error && (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive"
        >
          {error}
        </p>
      )}

      {/*
        This was a hand-rolled button: `bg-primary-1` (the filled-button fill,
        used raw), `rounded-xl` where the system has exactly one radius, and
        `font-bold` where the system tops out at semibold. It sat next to real
        <Button>s on the same pages and disagreed with all of them. The label
        keeps its own text when the form supplies one — "Submit" is the fallback
        of last resort, not a default worth reaching for.
      */}
      <Button
        type={preview ? 'button' : 'submit'}
        className="h-auto w-full py-[15px] text-body md:w-auto md:px-8"
        disabled={isSubmitting || preview}
        aria-busy={isSubmitting}
      >
        {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
        {form.submitButtonLabel || 'Send'}
      </Button>
    </Container>
  )
}

/** Just the fields of a form, controlled from outside: used where several forms share one submit (event applications). */
export function FormFieldList({ form, user, data, onChange }: { form: FormType; user?: any; data: Record<string, unknown>; onChange: (next: Record<string, unknown>) => void }) {
  const { t } = useTranslation()
  const hidden = getHiddenFields(form.fields || [], data)
  return (
    <div className="space-y-6">
      {form.fields?.map((field, i) => {
        const name = (field as { name?: string }).name ?? ''
        if (name && hidden.has(name)) return null
        return <FormField key={i} field={field} value={data[name]} onChange={v => onChange({ ...data, [name]: v })} user={user} rankingHint={t('forms.ranking_hint')} />
      })}
    </div>
  )
}

export const initialFormData = (form: FormType, user: any) => (form.fields ? prefillFormData(user, form.fields) : {})
