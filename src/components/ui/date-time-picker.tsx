"use client"

import { useEffect, useRef, useState } from "react"
import { CalendarIcon, ChevronDown, ChevronUp, X } from "lucide-react"
import { enUS, th } from "react-day-picker/locale"

import { useTranslation } from "@/i18n/client"
import { fromLocalInput, toLocalInput } from "@/libs/event-sections"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/libs/utils"

const DEFAULT_TIME = "09:00"
const todayLocal = () => toLocalInput(new Date().toISOString()).slice(0, 10)

/*
  Date (popover calendar) + time (typed HH:MM with an hour/minute column popover), sharing one ISO value.
  See design.md § Date and time.
  Date/time are read and written through toLocalInput/fromLocalInput, so the
  fixed +07:00 Bangkok offset behaves exactly as it did with datetime-local.
*/
export function DateTimePicker({ id, value, onChange, required }: {
  id?: string
  value: unknown
  onChange: (iso: string | null) => void
  required?: boolean
}) {
  const { locale } = useTranslation()
  const [open, setOpen] = useState(false)
  const local = toLocalInput(value) // "YYYY-MM-DDTHH:mm" or ""
  const day = local.slice(0, 10)
  const time = local.slice(11, 16)
  const selected = day ? new Date(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10)) : undefined
  const pad = (n: number) => String(n).padStart(2, "0")

  return (
    <div className="relative flex gap-2">
      {/* Native validation can't see a popover value; this mirrors it so `required` blocks submit. */}
      {required && <input tabIndex={-1} aria-hidden required value={day} onChange={() => {}} className="pointer-events-none absolute inset-0 opacity-0" />}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button id={id} type="button" variant="outline" className="h-11 min-w-0 flex-1 justify-start bg-card px-3.5 text-body font-normal">
            <CalendarIcon className="text-muted-foreground" />
            <span className="truncate">
              {selected ? selected.toLocaleDateString(locale === "th" ? "th-TH" : "en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <Calendar
            mode="single"
            locale={locale === "th" ? th : enUS}
            selected={selected}
            defaultMonth={selected}
            required
            onSelect={(d) => {
              if (!d) return
              onChange(fromLocalInput(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${time || DEFAULT_TIME}`))
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
      <TimeField required={required} value={time} onChange={(t) => onChange(fromLocalInput(`${day || todayLocal()}T${t}`))} />
      {!required && day && (
        <Button type="button" variant="ghost" size="icon" className="h-11" aria-label="Clear" onClick={() => onChange(null)}>
          <X />
        </Button>
      )}
    </div>
  )
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)

/* Typed HH:MM (24-hour); the popover is two columns, minutes in steps of 5. Typing covers any minute. */
function TimeField({ value, onChange, disabled, required }: {
  value: string
  onChange: (hhmm: string) => void
  disabled?: boolean
  required?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  const pad = (n: number) => String(n).padStart(2, "0")
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value)
  const hh = m ? +m[1] : -1
  const mm = m ? +m[2] : -1

  const set = (h: number, min: number) => onChange(`${pad(h)}:${pad(min)}`)
  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Input
          aria-label="Time, 24-hour"
          className="w-[7.5rem] flex-none text-center tabular-nums"
          inputMode="numeric"
          maxLength={5}
          placeholder="--:--"
          disabled={disabled}
          required={required}
          value={text}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          onChange={(e) => {
            let v = e.target.value.replace(/[^\d:]/g, "")
            if (/^\d{3,4}$/.test(v)) v = `${v.slice(0, -2)}:${v.slice(-2)}`
            setText(v)
            if (/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) onChange(v)
          }}
          onBlur={() => setText(value)}
        />
      </PopoverAnchor>
      <PopoverContent
        align="end"
        className="flex gap-1.5 p-2.5"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.target instanceof HTMLInputElement && setOpen(true)}
      >
        <TimeColumn label="Hour" values={HOURS} selected={hh} onPick={(h) => set(h, mm < 0 ? 0 : mm)} />
        <TimeColumn label="Minute" values={MINUTES} selected={mm} onPick={(min) => set(hh < 0 ? 9 : hh, min)} />
      </PopoverContent>
    </Popover>
  )
}

function TimeColumn({ label, values, selected, onPick }: {
  label: string
  values: number[]
  selected: number
  onPick: (v: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const on = ref.current?.querySelector<HTMLElement>("[aria-selected=true]")
    if (ref.current && on) ref.current.scrollTop = on.offsetTop - ref.current.clientHeight / 2 + on.clientHeight / 2
  }, [selected])
  // Arrows as well as wheel/touch: inside a sheet the page's scroll lock can swallow wheel events.
  const step = (dir: -1 | 1) => ref.current?.scrollBy({ top: dir * 3 * 34, behavior: "smooth" })
  const arrow = "grid h-6 w-full place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
  return (
    <div className="flex flex-col gap-1">
      <button type="button" tabIndex={-1} aria-label={`${label} up`} className={arrow} onClick={() => step(-1)}><ChevronUp className="size-4" /></button>
    <div ref={ref} role="listbox" aria-label={label} className="h-[170px] w-16 snap-y overflow-y-auto overscroll-contain [scrollbar-width:none]">
      {values.map((v) => (
        <button
          key={v}
          type="button"
          role="option"
          aria-selected={v === selected}
          onClick={() => onPick(v)}
          className={cn(
            "grid min-h-[34px] w-full snap-center place-items-center rounded-md tabular-nums text-muted-foreground hover:bg-muted",
            v === selected && "bg-primary text-primary-foreground hover:bg-primary"
          )}
        >
          {String(v).padStart(2, "0")}
        </button>
      ))}
    </div>
      <button type="button" tabIndex={-1} aria-label={`${label} down`} className={arrow} onClick={() => step(1)}><ChevronDown className="size-4" /></button>
    </div>
  )
}

/*
  Date only (a birthday, a plain date answer). Value is "YYYY-MM-DD", the same
  string a native date input produced, so callers and stored data don't change.
  A hidden input carries `name` so it still posts with a plain <form>.
*/
export function DatePicker({ id, name, value, onChange, required }: {
  id?: string
  name?: string
  value: string
  onChange: (ymd: string) => void
  required?: boolean
}) {
  const { locale } = useTranslation()
  const [open, setOpen] = useState(false)
  const selected = value ? new Date(+value.slice(0, 4), +value.slice(5, 7) - 1, +value.slice(8, 10)) : undefined
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    <div className="relative">
      {name && <input type="hidden" name={name} value={value} />}
      {required && <input tabIndex={-1} aria-hidden required value={value} onChange={() => {}} className="pointer-events-none absolute inset-0 opacity-0" />}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button id={id} type="button" variant="outline" className="h-11 w-full justify-start bg-card px-3.5 text-body font-normal">
            <CalendarIcon className="text-muted-foreground" />
            <span className="truncate">
              {selected ? selected.toLocaleDateString(locale === "th" ? "th-TH" : "en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <Calendar
            mode="single"
            locale={locale === "th" ? th : enUS}
            selected={selected}
            defaultMonth={selected}
            captionLayout="dropdown"
            startMonth={new Date(1930, 0)}
            endMonth={new Date(new Date().getFullYear() + 10, 11)}
            required
            onSelect={(d) => {
              if (!d) return
              onChange(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
