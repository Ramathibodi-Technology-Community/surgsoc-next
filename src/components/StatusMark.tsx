'use client'

import React from 'react'
import {
  Building2,
  CircleAlert,
  CircleCheck,
  CirclePlay,
  CirclePlus,
  CircleX,
  Clock,
  Eye,
  EyeOff,
  Hourglass,
  Inbox,
  Infinity as InfinityIcon,
  Lock,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/libs/utils'
import { useTranslation } from '@/i18n/client'

/**
 * The status marker. See design.md § Status vocabulary.
 *
 * Member and staff-switch states wear a 14px meaning icon, so they differ by
 * picture as well as colour. Applicant states keep the plain markers: four
 * states beside Accept and Reject would compete with the verbs if each had its
 * own picture. Colour carries urgency either way, and a dot reads as
 * actionable, so inert states never wear one.
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
  // staff switch states
  | 'published'
  | 'draft'
  | 'accepting'
  | 'not-accepting'
  | 'reg-open'
  | 'reg-closed'
  // applicant states: plain markers
  | 'applied'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'

// One lucide icon per picture, drawn at stroke 1.6 so the set matches the rest of the UI.
const ICON: Record<string, LucideIcon> = {
  open: CirclePlus,
  live: CirclePlay,
  waitlist: Hourglass,
  pending: Clock,
  overdue: CircleAlert,
  cancelled: CircleX,
  complete: CircleCheck,
  closed: Lock,
  'no-deadline': InfinityIcon,
  published: Eye,
  draft: EyeOff,
  accepting: Inbox,
  'reg-open': Building2,
}

// `mark` picks the icon above.
const STATUS: Record<StatusKey, { mark: string; icon: boolean; tone: string; label: string }> = {
  open: { mark: 'open', icon: true, tone: 'text-accent', label: 'Open' },
  live: { mark: 'live', icon: true, tone: 'text-accent', label: 'Happening now' },
  waitlist: { mark: 'waitlist', icon: true, tone: 'text-warning', label: 'Waitlist' },
  pending: { mark: 'pending', icon: true, tone: 'text-warning', label: 'Pending' },
  overdue: { mark: 'overdue', icon: true, tone: 'text-destructive', label: 'Overdue' },
  cancelled: { mark: 'cancelled', icon: true, tone: 'text-destructive', label: 'Cancelled' },
  complete: { mark: 'complete', icon: true, tone: 'text-info', label: 'Complete' },
  closed: { mark: 'closed', icon: true, tone: 'text-muted-foreground', label: 'Closed' },
  'no-deadline': { mark: 'no-deadline', icon: true, tone: 'text-muted-foreground', label: 'No deadline' },
  published: { mark: 'published', icon: true, tone: 'text-accent', label: 'Published' },
  draft: { mark: 'draft', icon: true, tone: 'text-muted-foreground', label: 'Draft' },
  accepting: { mark: 'accepting', icon: true, tone: 'text-accent', label: 'Accepting responses' },
  'not-accepting': { mark: 'closed', icon: true, tone: 'text-muted-foreground', label: 'Not accepting' },
  'reg-open': { mark: 'reg-open', icon: true, tone: 'text-accent', label: 'Registration open' },
  'reg-closed': { mark: 'closed', icon: true, tone: 'text-muted-foreground', label: 'Registration closed' },
  applied: { mark: 'pending', icon: true, tone: 'text-warning', label: 'Applied' },
  accepted: { mark: 'complete', icon: true, tone: 'text-info', label: 'Accepted' },
  rejected: { mark: 'cancelled', icon: true, tone: 'text-destructive', label: 'Rejected' },
  withdrawn: { mark: 'closed', icon: true, tone: 'text-muted-foreground', label: 'Withdrawn' },
}

const markClass = (spec: (typeof STATUS)[StatusKey]) => cn('mark', spec.tone)

function Icon({ spec }: { spec: (typeof STATUS)[StatusKey] }) {
  const Glyph = ICON[spec.mark]
  return <Glyph aria-hidden="true" strokeWidth={1.6} />
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
  // Default word comes from the dictionary; `t` returns the key when missing, so fall back to English.
  const { t } = useTranslation()
  const translated = t(`status.${status}`)
  return (
    <span className={cn(markClass(spec), className)}>
      <Icon spec={spec} />
      {label ?? (translated.startsWith('status.') ? spec.label : translated)}
    </span>
  )
}

/** The marker alone, for places where the word is already in the copy beside it. */
export function StatusDot({ status, className }: { status: StatusKey; className?: string }) {
  const spec = STATUS[status]
  return (
    <span aria-hidden="true" className={cn(markClass(spec), className)}>
      <Icon spec={spec} />
    </span>
  )
}
