"use client"

import * as React from "react"
import { AlertDialog } from "radix-ui"

import { Button } from "@/components/ui/button"

/*
  design.md § Confirmation dialog. Centred on every width (never a bottom
  sheet), no hairlines, the title is the question, the way out names what is
  kept — never "Cancel". Radix AlertDialog gives focus-on-the-way-out, Esc and
  focus return for free; the backdrop click is wired to the way out too.
*/
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  action,
  keep,
  onConfirm,
  destructive = false,
  pending = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The question: "Stop accepting responses?" */
  title: React.ReactNode
  /** What members will see, and whether it can be undone. */
  description: React.ReactNode
  /** Names the action: "Stop accepting". */
  action: React.ReactNode
  /** Names what is kept: "Keep accepting". */
  keep: React.ReactNode
  onConfirm: () => void
  /** Outlined red — for actions that take something away from members. */
  destructive?: boolean
  /** In-flight: the one allowed disabled state. */
  pending?: boolean
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay
          className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0"
          onClick={() => !pending && onOpenChange(false)}
        />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-md bg-surface p-[26px] text-foreground shadow-[var(--shadow-lifted)]">
          <AlertDialog.Title className="text-xl font-semibold">{title}</AlertDialog.Title>
          <AlertDialog.Description className="text-sm leading-relaxed text-secondary-foreground">
            {description}
          </AlertDialog.Description>
          <div className="mt-2 flex flex-wrap justify-end gap-2.5">
            <AlertDialog.Cancel asChild>
              <Button variant="outline" disabled={pending}>{keep}</Button>
            </AlertDialog.Cancel>
            <Button
              variant={destructive ? "destructive" : "default"}
              pending={pending}
              onClick={onConfirm}
            >
              {action}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
