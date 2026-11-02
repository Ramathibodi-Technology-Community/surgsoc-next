'use client'

import React from 'react'
import { enUS, th } from 'react-day-picker/locale'
import { Calendar } from '@/components/ui/calendar'
import { useTranslation } from '@/i18n/client'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel'

export type CalendarEntry = {
  id: string
  /** Local calendar days (YYYY-MM-DD, Asia/Bangkok) the event covers, first to last. */
  days: string[]
  upcoming: boolean
  /** Server-rendered EventCard — the calendar only decides which ones show. */
  card: React.ReactNode
}

const keyOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const dateOf = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Month calendar beside a carousel of the events on the chosen day.
 *
 * Nothing chosen: show the nearest upcoming event (or the latest past one when
 * none are upcoming) so the section is never empty on first paint. Tapping the
 * chosen day again clears the choice and returns to that default.
 */
export default function UpcomingCalendar({
  entries,
  defaultId,
}: {
  entries: CalendarEntry[]
  defaultId: string | null
}) {
  const { t, locale } = useTranslation()
  const labels = {
    empty: t('events.calendar_empty'),
    slide: t('events.calendar_slide'),
    of: t('events.calendar_of'),
    legendUpcoming: t('events.calendar_legend_upcoming'),
    legendPast: t('events.calendar_legend_past'),
  }
  const [selected, setSelected] = React.useState<Date | undefined>()
  const [api, setApi] = React.useState<CarouselApi>()
  const [index, setIndex] = React.useState(0)

  const byDay = React.useMemo(() => {
    const map = new Map<string, CalendarEntry[]>()
    for (const entry of entries) {
      for (const day of entry.days) map.set(day, [...(map.get(day) ?? []), entry])
    }
    return map
  }, [entries])

  const fallback = entries.find((e) => e.id === defaultId)
  const shown = selected ? (byDay.get(keyOf(selected)) ?? []) : fallback ? [fallback] : []

  const upcomingDays = React.useMemo(
    () => [...byDay].filter(([, list]) => list.some((e) => e.upcoming)).map(([d]) => dateOf(d)),
    [byDay],
  )
  const pastDays = React.useMemo(
    () => [...byDay].filter(([, list]) => !list.some((e) => e.upcoming)).map(([d]) => dateOf(d)),
    [byDay],
  )

  React.useEffect(() => {
    if (!api) return
    const sync = () => setIndex(api.selectedScrollSnap())
    sync()
    api.on('select', sync)
    api.on('reInit', sync)
    return () => {
      api.off('select', sync)
      api.off('reInit', sync)
    }
  }, [api])

  // A different day is a different set of slides: start from the first.
  const setKey = shown.map((e) => e.id).join(',')
  React.useEffect(() => {
    api?.scrollTo(0, true)
  }, [api, setKey])

  const month = fallback ? dateOf(fallback.days[0]) : new Date()
  const dot =
    'relative [&>button]:after:absolute [&>button]:after:bottom-1 [&>button]:after:left-1/2 [&>button]:after:size-1 [&>button]:after:-translate-x-1/2 [&>button]:after:rounded-full'

  return (
    <div className="grid gap-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
      <div className="panel w-fit max-w-full justify-self-center rounded-md p-4 md:justify-self-start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={setSelected}
          defaultMonth={month}
          locale={locale === 'th' ? th : enUS}
          modifiers={{ upcomingDay: upcomingDays, pastDay: pastDays }}
          modifiersClassNames={{
            upcomingDay: `${dot} [&>button]:after:bg-accent`,
            pastDay: `${dot} [&>button]:after:bg-muted-foreground/60`,
          }}
          classNames={{ weekday: 'size-[34px] pointer-coarse:size-11 text-xs font-normal text-muted-foreground' }}
        />
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-meta text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            {labels.legendUpcoming}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-muted-foreground/60" aria-hidden />
            {labels.legendPast}
          </span>
        </p>
      </div>

      <div className="min-w-0" aria-live="polite">
        {shown.length === 0 ? (
          <div className="empty-note">
            <p className="font-medium text-secondary-foreground">{labels.empty}</p>
          </div>
        ) : (
          <Carousel opts={{ align: 'start' }} setApi={setApi}>
            <CarouselContent className="-ml-3.5">
              {shown.map((entry) => (
                <CarouselItem key={entry.id} className="pl-3.5 lg:basis-1/2">
                  {entry.card}
                </CarouselItem>
              ))}
            </CarouselContent>
            {shown.length > 1 && (
              <div className="mt-3 flex items-center justify-between">
                <span className="text-meta text-muted-foreground">
                  {labels.slide} {index + 1} {labels.of} {shown.length}
                </span>
                <div className="flex gap-2">
                  <CarouselPrevious className="static translate-y-0 size-[34px] pointer-coarse:size-11" />
                  <CarouselNext className="static translate-y-0 size-[34px] pointer-coarse:size-11" />
                </div>
              </div>
            )}
          </Carousel>
        )}
      </div>
    </div>
  )
}
