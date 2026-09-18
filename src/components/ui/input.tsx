import * as React from "react"

import { cn } from "@/libs/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Fields are filled, not outlined-on-transparent: the design puts them on
        // --card so they read as inputs against the surface panels they sit in.
        // This is unconditional rather than behind `dark:` — the site has one
        // theme, and the media-query variant left fields transparent for anyone
        // whose OS was set to light.
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground bg-card border-input h-11 w-full min-w-0 rounded-md border px-3.5 py-2 text-[15px] transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
