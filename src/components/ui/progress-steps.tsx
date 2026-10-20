import * as React from "react"
import { cn } from "@/libs/utils"

/*
  Where an event is in its life, read left to right (board: Sessions tab, "progress steps").
  Same 3px-bar language as SectionTabs, but not links: finished steps keep a lit bar,
  the current one is accent, the rest are rules. Each step says what it is and when.
*/
export type ProgressStep = { label: string; note?: string; state: "done" | "current" | "todo" }

export function ProgressSteps({ steps, label }: { steps: ProgressStep[]; label: string }) {
  return (
    <ol aria-label={label} className="mb-6 flex gap-3.5 overflow-x-auto [scrollbar-width:none]">
      {steps.map((step) => (
        <li
          key={step.label}
          aria-current={step.state === "current" ? "step" : undefined}
          className={cn(
            "relative min-w-28 flex-1 pt-[15px] text-meta whitespace-nowrap",
            "before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:rounded-sm before:content-['']",
            step.state === "done" && "text-secondary-foreground before:bg-primary",
            step.state === "current" && "font-medium text-foreground before:bg-accent",
            step.state === "todo" && "text-muted-foreground before:bg-border-strong",
          )}
        >
          <span className="block">{step.label}</span>
          {step.note && <span className="block text-xs font-normal text-muted-foreground">{step.note}</span>}
        </li>
      ))}
    </ol>
  )
}
