"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/libs/utils"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

/*
  design.md § Switch and ConfirmSwitch. A switch is a STATE (Published,
  Accepting responses), not an action. 44 × 26 track, 20px thumb; the hit area
  is padded to 44px. Plain `Switch` flips at once; use `ConfirmSwitch` when the
  change affects what members see or can do.
*/
export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "relative inline-flex h-[26px] w-11 shrink-0 cursor-pointer items-center rounded-full bg-input p-0 outline-hidden transition-colors duration-150",
        "before:absolute before:-inset-x-0.5 before:-inset-y-[9px] before:content-['']", // 44px target
        "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-accent",
        "data-[state=checked]:bg-primary",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-5 translate-x-[3px] rounded-full bg-foreground transition-transform duration-150 data-[state=checked]:translate-x-[21px]" />
    </SwitchPrimitive.Root>
  )
}

/* The switch moves only on confirm; both directions go through the dialog. */
export function ConfirmSwitch({
  checked,
  onConfirm,
  on,
  off,
  pending,
  ...props
}: Omit<React.ComponentProps<typeof Switch>, "onCheckedChange" | "checked"> & {
  checked: boolean
  onConfirm: (next: boolean) => void
  /** Dialog copy when turning ON. */
  on: { title: React.ReactNode; description: React.ReactNode; action: React.ReactNode; keep: React.ReactNode }
  /** Dialog copy when turning OFF; destructive. */
  off: { title: React.ReactNode; description: React.ReactNode; action: React.ReactNode; keep: React.ReactNode }
  pending?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const copy = checked ? off : on
  return (
    <>
      <Switch {...props} disabled={props.disabled || pending} checked={checked} onCheckedChange={() => setOpen(true)} />
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={copy.title}
        description={copy.description}
        action={copy.action}
        keep={copy.keep}
        destructive={checked}
        pending={pending}
        onConfirm={() => {
          onConfirm(!checked)
          setOpen(false)
        }}
      />
    </>
  )
}
