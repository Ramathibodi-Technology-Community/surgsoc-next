"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/libs/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({ className, classNames, ...props }: React.ComponentProps<typeof DayPicker>) {
  const nav = cn(buttonVariants({ variant: "ghost", size: "icon" }), "absolute top-0")
  return (
    <DayPicker
      showOutsideDays
      className={cn("p-0", className)}
      classNames={{
        root: "relative w-fit",
        months: "flex flex-col",
        month: "flex flex-col gap-3",
        month_caption: "flex h-8 items-center justify-center text-sm font-medium",
        caption_label: "inline-flex items-center gap-1 text-sm font-medium",
        // Dropdown caption: the native <select> sits invisibly over the label, so the label is what shows.
        dropdowns: "flex items-center gap-1.5",
        dropdown_root: "relative inline-flex h-8 items-center rounded-md border border-input px-2 has-[:focus-visible]:border-ring",
        dropdown: "absolute inset-0 cursor-pointer opacity-0 [&>option]:bg-popover [&>option]:text-popover-foreground",
        nav: "contents",
        button_previous: cn(nav, "left-0"),
        button_next: cn(nav, "right-0"),
        month_grid: "border-collapse",
        weekday: "size-9 text-xs font-normal text-muted-foreground",
        day: "p-0 text-center text-sm",
        day_button: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "font-normal"
        ),
        selected: "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button:hover]:bg-primary",
        today: "[&>button]:border [&>button]:border-accent",
        outside: "text-muted-foreground/50",
        disabled: "opacity-40",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />,
      }}
      {...props}
    />
  )
}

export { Calendar }
