import * as React from "react"

import { cn } from "@/libs/utils"

/*
  design.md § Saved line. One quiet line under a tab row that saves as you go.
  The single exception to "nothing says Saved": it never moves, animates or
  becomes a toast.
*/
export function SavedLine({
  state,
  at,
  onRetry,
  labels,
}: {
  state: "idle" | "saving" | "saved" | "error"
  /** Pre-formatted time, e.g. "14:02". */
  at?: string
  onRetry?: () => void
  labels: { saving: string; saved: string; error: string; retry: string }
}) {
  return (
    <p aria-live="polite" className={cn("min-h-[1.4em] text-meta", state === "error" ? "text-destructive" : "text-muted-foreground")}>
      {state === "saving" && labels.saving}
      {state === "saved" && `${labels.saved}${at ? ` ${at}` : ""}`}
      {state === "error" && (
        <>
          {labels.error} ·{" "}
          <button type="button" className="underline" onClick={onRetry}>
            {labels.retry}
          </button>
        </>
      )}
    </p>
  )
}
