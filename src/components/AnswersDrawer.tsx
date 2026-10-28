'use client'

import type React from 'react'

import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { answerOf, formatAnswer, type AnswerField, type AnswerRow } from '@/libs/forms/answers'

/* The filled form, read-only, in the edit-sheet shell: bottom sheet on a phone, right drawer from md. */
export default function AnswersDrawer({ open, onOpenChange, title, description, fields, rows, actions, onPrev, onNext, position, children }: {
  /** Extra sections under the answers (per-session answers and decisions). */
  children?: React.ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  fields: AnswerField[]
  rows: AnswerRow[] | null | undefined
  /** A decision bar under the answers (applicants). */
  actions?: React.ReactNode
  /** Step through the list without closing (board: Applicants, full response). */
  onPrev?: () => void
  onNext?: () => void
  position?: string
}) {
  const known = new Set(fields.map(field => field.name))
  const extra = (rows || []).filter(row => !known.has(row.field))
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="edit" className="gap-0 md:max-w-[420px]">
        <SheetHeader className="px-6 pt-6 pb-2">
          <SheetTitle className="panel-title text-xl">{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
          {(onPrev || onNext) && (
            <div className="flex items-center gap-1 pt-1">
              <Button type="button" variant="ghost" size="icon" aria-label="Previous" disabled={!onPrev} onClick={onPrev}><ChevronUp /></Button>
              <Button type="button" variant="ghost" size="icon" aria-label="Next" disabled={!onNext} onClick={onNext}><ChevronDown /></Button>
              {position && <span className="text-meta text-muted-foreground">{position}</span>}
            </div>
          )}
        </SheetHeader>
        <dl className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {fields.map(field => (
            <div key={field.name}>
              <dt className="text-xs text-muted-foreground">{field.label}</dt>
              <dd className="mt-1 whitespace-pre-wrap text-body">{answerOf(rows, field.name)}</dd>
            </div>
          ))}
          {extra.map(row => (
            <div key={row.field}>
              <dt className="text-xs text-muted-foreground">{row.field}</dt>
              <dd className="mt-1 whitespace-pre-wrap text-body">{formatAnswer(row.value)}</dd>
            </div>
          ))}
        </dl>
        {children && <div className="space-y-5 overflow-y-auto border-t border-border px-6 py-5">{children}</div>}
        {actions && <div className="flex flex-wrap justify-end gap-2 border-t border-border px-6 py-4">{actions}</div>}
      </SheetContent>
    </Sheet>
  )
}
