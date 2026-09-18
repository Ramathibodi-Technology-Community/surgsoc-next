'use client'

import React from 'react'

interface SliderFieldProps {
  label: string
  variant?: 'rating' | 'stars' | 'slider'
  min?: number
  max?: number
  step?: number
  showLabels?: boolean
  minLabel?: string
  maxLabel?: string
  value?: number
  onChange: (value: number) => void
  required?: boolean
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={`w-8 h-8 transition-[color,background-color,border-color,transform] ${
        filled ? 'fill-warning text-warning' : 'fill-transparent text-muted-foreground/40'
      }`}
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  )
}

export default function SliderField({
  label,
  variant = 'rating',
  min = 1,
  max = 5,
  step = 1,
  showLabels = true,
  minLabel,
  maxLabel,
  value,
  onChange,
  required,
}: SliderFieldProps) {
  const scale = Array.from(
    { length: Math.round((max - min) / step) + 1 },
    (_, i) => min + i * step,
  )

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium leading-none mb-3">
        {label} {required && <span className="text-destructive">*</span>}
      </legend>

      {/* ── Stars variant ── */}
      {variant === 'stars' && (
        <div className="flex gap-1 flex-wrap">
          {scale.map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => onChange(rating)}
              aria-label={`Rate ${rating}`}
              className="transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              <StarIcon filled={value !== undefined && rating <= value} />
            </button>
          ))}
          {showLabels && (minLabel || maxLabel) && (
            <div className="w-full flex justify-between text-xs text-muted-foreground mt-1">
              <span>{minLabel}</span>
              <span>{maxLabel}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Numbered rating buttons variant ── */}
      {variant === 'rating' && (
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            {scale.map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => onChange(rating)}
                aria-label={`Rate ${rating}`}
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 transition-[color,background-color,border-color,transform] flex items-center justify-center font-bold text-sm ${
                  value === rating
                    ? 'bg-primary border-primary text-primary-foreground shadow-md scale-105'
                    : 'bg-background border-border text-muted-foreground hover:border-primary/60 hover:text-primary'
                }`}
              >
                {rating}
              </button>
            ))}
          </div>
          {showLabels && (minLabel || maxLabel) && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{minLabel}</span>
              <span>{maxLabel}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Slider bar variant ── */}
      {variant === 'slider' && (
        <div className="space-y-2 px-1">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value ?? min}
            onChange={(e) => onChange(Number(e.target.value))}
            required={required}
            className="w-full accent-primary cursor-pointer"
          />
          <div className="flex justify-between items-center">
            {showLabels ? (
              <>
                <span className="text-xs text-muted-foreground">{minLabel || min}</span>
                <span className="text-sm font-semibold text-primary tabular-nums">
                  {value ?? min}
                </span>
                <span className="text-xs text-muted-foreground">{maxLabel || max}</span>
              </>
            ) : (
              <span className="text-sm font-semibold text-primary tabular-nums mx-auto">
                {value ?? min}
              </span>
            )}
          </div>
        </div>
      )}
    </fieldset>
  )
}
