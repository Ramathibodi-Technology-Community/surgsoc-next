import React from 'react'
import Link from 'next/link'
import { PublishToggle } from '@/components/events/StaffActions'
import { SectionTabs } from '@/components/ui/section-tabs'
import type { getDictionary } from '@/i18n/server'

export type StaffTab = 'basics' | 'sessions' | 'applicants' | 'reflections' | 'settings'

/*
  The staff view of one event: title, the Published switch, then the section
  tabs. design.md § Section tabs. Each tab is its own URL.
*/
export default function StaffShell({ event, t, tab, counts, showReflections, showSettings, children }: {
  event: { id: number; name: string; is_visible?: boolean | null; event_structure?: string | null; parent_event?: unknown }
  t: Awaited<ReturnType<typeof getDictionary>>['events']
  tab: StaffTab
  counts: { pending: number; overdue: number; applied?: number }
  showReflections: boolean
  showSettings: boolean
  children: React.ReactNode
}) {
  const base = `/events/${event.id}`
  const tabs = [
    { key: 'basics', label: t.staff.basics, href: `${base}/edit` },
    { key: 'sessions', label: t.staff.tab_sessions, href: `${base}/edit?tab=sessions` },
    { key: 'applicants', label: t.staff.applicants, href: `${base}/applicants`, badge: counts.pending || undefined, badgeTone: 'warning' as const },
    ...(showReflections ? [{ key: 'reflections', label: t.staff.tab_reflections, href: `${base}/edit?tab=reflections`, badge: counts.overdue || undefined, badgeTone: 'warning' as const }] : []),
    ...(showSettings ? [{ key: 'settings', label: t.staff.tab_settings, href: `${base}/edit?tab=settings` }] : []),
  ]
  return (
    <>
      {/* The Published switch sits where the public page's Edit event does: on the Back row, so neither adds height above the title. */}
      <div className="flex items-center justify-between gap-3">
        <Link href="/events" className="hit-area text-meta text-muted-foreground hover:text-foreground">← {t.back_to_events}</Link>
        <PublishToggle eventId={event.id} visible={!!event.is_visible} applied={counts.applied} />
      </div>
      <div className="mt-2 mb-6">
        <h1 className="type-h1">{event.name}</h1>
        <p className="mt-2 flex items-center gap-3 text-meta text-muted-foreground">
          <span>{t.structure[(event.event_structure || 'standalone') as keyof typeof t.structure]}</span>
        </p>
      </div>
      <SectionTabs label={t.staff.tabs_label} value={tab} tabs={tabs} />
      {children}
    </>
  )
}
