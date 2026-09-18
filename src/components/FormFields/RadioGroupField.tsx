'use client'

import React from 'react'

interface RadioGroupFieldProps {
  label: string
  options: { label: string; value: string }[]
  layout?: 'vertical' | 'horizontal'
  value?: string
  onChange: (value: string) => void
  required?: boolean
}

export default function RadioGroupField({
  label,
  options,
  layout = 'vertical',
  value,
  onChange,
  required,
}: RadioGroupFieldProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium leading-none mb-3">
        {label} {required && <span className="text-destructive">*</span>}
      </legend>
      <div
        className={
          layout === 'horizontal'
            ? 'flex flex-wrap gap-4'
            : 'flex flex-col gap-2'
        }
      >
        {options.map((opt) => {
          const id = `radio-${label}-${opt.value}`
          const isSelected = value === opt.value
          return (
            <label
              key={opt.value}
              htmlFor={id}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-[color,background-color,border-color] select-none ${
                isSelected
                  ? 'border-primary bg-primary/5 text-primary font-medium'
                  : 'border-border bg-background hover:border-primary/40 hover:bg-muted/40 text-foreground'
              }`}
            >
              {/* Custom radio circle */}
              <span
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  isSelected ? 'border-primary' : 'border-muted-foreground/50'
                }`}
              >
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-primary" />
                )}
              </span>
              <input
                type="radio"
                id={id}
                name={label}
                value={opt.value}
                checked={isSelected}
                onChange={() => onChange(opt.value)}
                required={required}
                className="sr-only"
              />
              {opt.label}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
