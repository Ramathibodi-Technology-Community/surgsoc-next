"use client"

import { useId, useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { cn } from "@/libs/utils"

type Option = { value: string; label: string }

// A Select you can type into, for lists too long to scroll (every member).
// ponytail: filters in memory; move to a server search if the list reaches thousands.
export function Combobox({ id, value, options, onChange, placeholder, emptyLabel, noneLabel }: {
  id?: string
  value: string | null
  options: Option[]
  onChange: (value: string | null) => void
  placeholder: string
  emptyLabel: string
  noneLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const listId = useId()
  const selected = options.find(option => option.value === value)
  const needle = query.trim().toLocaleLowerCase()
  const matches = (needle ? options.filter(option => option.label.toLocaleLowerCase().includes(needle)) : options).slice(0, 50)
  const choose = (next: string | null) => { onChange(next); setOpen(false); setQuery("") }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button id={id} type="button" role="combobox" aria-expanded={open} aria-controls={listId} className="bg-card border-input flex h-11 w-full items-center justify-between gap-2 rounded-md border px-3.5 text-left text-body outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50">
          <span className={cn("truncate", !selected && "text-muted-foreground")}>{selected?.label || noneLabel || "—"}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2">
        <Input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="mb-2" />
        <ul id={listId} role="listbox" className="max-h-64 overflow-y-auto">
          {noneLabel && !needle && (
            <li><button type="button" role="option" aria-selected={!value} onClick={() => choose(null)} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-body text-muted-foreground hover:bg-accent/10 focus-visible:bg-accent/10 focus-visible:outline-none">{noneLabel}</button></li>
          )}
          {matches.map(option => (
            <li key={option.value}>
              <button type="button" role="option" aria-selected={option.value === value} onClick={() => choose(option.value)} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-body hover:bg-accent/10 focus-visible:bg-accent/10 focus-visible:outline-none">
                <Check className={cn("size-4 shrink-0", option.value === value ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                <span className="truncate">{option.label}</span>
              </button>
            </li>
          ))}
          {!matches.length && <li className="px-2.5 py-2 text-meta text-muted-foreground">{emptyLabel}</li>}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
