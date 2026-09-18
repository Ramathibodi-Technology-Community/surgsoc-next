'use client'

import React, { useCallback, useState } from 'react'
import type { Form as FormType } from '@payloadcms/plugin-form-builder/types'
import FormField from './FormField'
import StatusMark from './StatusMark'
import { Button } from './ui/button'
import { Loader2 } from 'lucide-react'
import { prefillFormData } from '@/libs/forms/prefillUserData'
import { getHiddenFields } from '@/libs/forms/conditionalLogic'

interface Props {
  form: FormType
  onSubmit: (data: Record<string, unknown>) => Promise<void>
  user?: any // Optional user object for prefilling and UserProfileField
}

export default function PayloadForm({ form, onSubmit, user }: Props) {
  // Prefill is a pure function of the user + field list, so it only needs to
  // run once as the initial state, not re-sync in an effect on every render
  // where `form.fields` gets a fresh object identity (which would overwrite
  // whatever the user has since typed).
  const [formData, setFormData] = useState<Record<string, unknown>>(() =>
    user && form.fields ? prefillFormData(user, form.fields) : {}
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      await onSubmit(formData)
      setSuccess(true)
      setFormData({})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    }
    setIsSubmitting(false)
  }, [formData, onSubmit])

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
      const confirmation =
        form.confirmationMessage?.root?.children?.[0]?.children?.[0]?.text ||
        'Your response is recorded.'

      return (
          <div className="rounded-[10px] border border-success/30 bg-success/10 p-6">
              <StatusMark status="complete" label="Submitted" className="mb-3" />
              <p className="max-w-[52ch] leading-relaxed text-secondary-foreground">{confirmation}</p>
              {allowMultiple && (
                <button
                  type="button"
                  onClick={() => setSuccess(false)}
                  className="mt-4 text-[13px] font-medium text-accent transition-colors hover:text-accent/80"
                >
                  Submit another response
                </button>
              )}
          </div>
      )
  }

  const hiddenFields = getHiddenFields(form.fields || [], formData)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
            />
        )
      })}
      {error && (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-[10px] border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive"
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
        type="submit"
        className="h-auto w-full py-[15px] text-[15px] md:w-auto md:px-8"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
        {form.submitButtonLabel || 'Send'}
      </Button>
    </form>
  )
}
