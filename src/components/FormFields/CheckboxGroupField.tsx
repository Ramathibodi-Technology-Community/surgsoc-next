'use client'

import React, { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'

interface CheckboxGroupFieldProps {
  label: string
  options: { label: string; value: string }[]
  minSelect?: number
  maxSelect?: number
  value?: string[]
  onChange: (value: string[]) => void
  required?: boolean
}

export default function CheckboxGroupField({
  label,
  options,
  minSelect = 0,
  maxSelect = 0,
  value = [],
  onChange,
  required,
}: CheckboxGroupFieldProps) {
  const [error, setError] = useState<string | null>(null)

  const toggle = (optValue: string) => {
    const current = value || []
    const next = current.includes(optValue)
      ? current.filter((v) => v !== optValue)
      : [...current, optValue]

    // Validate max
    if (maxSelect > 0 && next.length > maxSelect) {
      setError(`Select at most ${maxSelect} option${maxSelect !== 1 ? 's' : ''}`)
      return
    }
    setError(null)
    onChange(next)
  }

  const validationHint =
    minSelect > 0 && maxSelect > 0
      ? `Select ${minSelect}–${maxSelect} options`
      : minSelect > 0
      ? `Select at least ${minSelect} option${minSelect !== 1 ? 's' : ''}`
      : maxSelect > 0
      ? `Select at most ${maxSelect} option${maxSelect !== 1 ? 's' : ''}`
      : null

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium leading-none mb-3">
        {label} {required && <span className="text-destructive">*</span>}
        {validationHint && (
          <span className="block text-xs font-normal text-muted-foreground mt-0.5">
            {validationHint}
          </span>
        )}
      </legend>
      <div className="flex flex-col gap-2">
        {options.map((opt) => {
          const id = `chkgrp-${label}-${opt.value}`
          const isChecked = (value || []).includes(opt.value)
          return (
            <label
              key={opt.value}
              htmlFor={id}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-[color,background-color,border-color] select-none ${
                isChecked
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-background hover:border-primary/40 hover:bg-muted/40'
              }`}
            >
              <Checkbox
                id={id}
                checked={isChecked}
                onCheckedChange={() => toggle(opt.value)}
                className="shrink-0"
              />
              <span className={isChecked ? 'text-primary font-medium' : 'text-foreground'}>
                {opt.label}
              </span>
            </label>
          )
        })}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </fieldset>
  )
}
