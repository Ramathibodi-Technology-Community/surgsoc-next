import React from 'react'
import { cn } from '@/libs/utils'

/**
 * The status marker. See design.md § Status vocabulary.
 *
 * Shape carries the *kind* of state, colour carries urgency — which is why the
 * set stays readable in greyscale, at 8px, and for anyone who cannot separate
 * teal from green. A dot reads as actionable, so inert states get a rule
 * instead; that is the whole reason `closed` is not a grey circle.
 */
export type StatusKey =
  | 'open'
  | 'live'
  | 'waitlist'
  | 'pending'
  | 'overdue'
  | 'cancelled'
  | 'complete'
  | 'closed'
  | 'no-deadline'

type Shape = 'circle' | 'play' | 'check' | 'cross' | 'rule'

const STATUS: Record<StatusKey, { shape: Shape; tone: string; label: string }> = {
  open: { shape: 'circle', tone: 'text-accent', label: 'Open' },
  live: { shape: 'play', tone: 'text-accent', label: 'Happening now' },
  waitlist: { shape: 'circle', tone: 'text-warning', label: 'Waitlist' },
  pending: { shape: 'circle', tone: 'text-warning', label: 'Pending' },
  overdue: { shape: 'circle', tone: 'text-destructive', label: 'Overdue' },
  cancelled: { shape: 'cross', tone: 'text-destructive', label: 'Cancelled' },
  complete: { shape: 'check', tone: 'text-success', label: 'Complete' },
  closed: { shape: 'rule', tone: 'text-muted-foreground', label: 'Closed' },
  'no-deadline': { shape: 'rule', tone: 'text-muted-foreground', label: 'No deadline' },
}

const SHAPE_CLASS: Record<Shape, string> = {
  circle: 'mark-circle',
  play: 'mark-play',
  check: 'mark-check',
  cross: 'mark-cross',
  rule: 'mark-rule',
}

export default function StatusMark({
  status,
  label,
  className,
}: {
  status: StatusKey
  /** Overrides the default word — the marker and colour stay bound to `status`. */
  label?: string
  className?: string
}) {
  const spec = STATUS[status]
  return (
    <span className={cn('mark', SHAPE_CLASS[spec.shape], spec.tone, className)}>
      {label ?? spec.label}
    </span>
  )
}

/** The marker alone, for places where the word is already in the copy beside it. */
export function StatusDot({ status, className }: { status: StatusKey; className?: string }) {
  const spec = STATUS[status]
  return (
    <span
      aria-hidden="true"
      className={cn('mark', SHAPE_CLASS[spec.shape], spec.tone, className)}
    />
  )
}
