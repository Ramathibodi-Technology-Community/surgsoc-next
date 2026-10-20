"use client"

import * as React from "react"
import Link from "next/link"

import { cn } from "@/libs/utils"

/*
  design.md § Section tabs. One component for sections of a record and steps of
  a sequence: equal titled segments with a 3px bar above each title. The open
  tab's bar is accent; in `steps` mode finished steps keep a lit primary bar and
  a check. Each tab is a link, so a refresh or a shared link lands on the same
  tab. Inside a single record's staff view only.
*/
export type SectionTab = {
  key: string
  label: React.ReactNode
  href: string
  /** A count that answers something the tab does not, e.g. Applicants waiting. */
  badge?: number
  badgeTone?: "warning" | "muted"
  /** steps mode: this step is finished. */
  done?: boolean
}

export function SectionTabs({ tabs, value, label, className }: { tabs: SectionTab[]; value: string; label: string; className?: string }) {
  const refs = React.useRef<(HTMLAnchorElement | null)[]>([])
  const i = tabs.findIndex((t) => t.key === value)
  const move = (e: React.KeyboardEvent, idx: number) => {
    const n = e.key === "ArrowRight" ? idx + 1 : e.key === "ArrowLeft" ? idx - 1 : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : -1
    if (n < 0) return
    e.preventDefault()
    refs.current[(n + tabs.length) % tabs.length]?.focus()
  }
  return (
    <div role="tablist" aria-label={label} className={cn("mb-6 flex gap-3.5 overflow-x-auto [scrollbar-width:none]", className)}>
      {tabs.map((t, idx) => {
        const active = idx === i
        return (
          <Link
            key={t.key}
            ref={(el) => { refs.current[idx] = el }}
            href={t.href}
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onKeyDown={(e) => move(e, idx)}
            className={cn(
              "relative flex min-w-24 flex-1 items-center pt-[15px] text-meta font-medium whitespace-nowrap text-muted-foreground no-underline hover:text-foreground",
              "before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:rounded-sm before:bg-border-strong before:content-['']",
              t.done && "text-secondary-foreground before:bg-primary",
              active && "text-foreground before:bg-accent"
            )}
          >
            {t.label}
            {t.badge != null && (
              <span
                aria-hidden
                className={cn(
                  "ml-2 rounded-full px-[7px] text-xs leading-normal font-semibold tabular-nums",
                  t.badgeTone === "muted" ? "bg-muted text-secondary-foreground" : "bg-warning/15 text-warning"
                )}
              >
                {t.badge}
              </span>
            )}
            {t.badge != null && <span className="sr-only">, {t.badge}</span>}
            {t.done && <span className="sr-only">, completed</span>}
          </Link>
        )
      })}
    </div>
  )
}
