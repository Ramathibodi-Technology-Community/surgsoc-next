import * as React from "react"

import { cn } from "@/libs/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // Matched to <Input>: same --card fill, same border token, same 3.5
        // inset and 15px type. This primitive was still on shadcn's stock
        // `bg-transparent` + `dark:bg-input/30`, so a textarea sat in a visibly
        // different fill from the text inputs directly above it in the same
        // form — see the note in input.tsx for why the fill is unconditional
        // rather than behind `dark:`.
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-card flex field-sizing-content min-h-24 w-full rounded-md border px-3.5 py-2.5 text-[15px] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
