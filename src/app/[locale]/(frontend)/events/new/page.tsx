import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/libs/auth/current-user'
import { canManageEvent } from '@/libs/event-workflow'
import { hasPermission } from '@/libs/permissions'
import { findTags, tagLabel, tagPath } from '@/libs/tags'
import { idOf } from '@/libs/form-assignment-lifecycle'
import { sectionFields, type EventStructure } from '@/libs/event-sections'
import { getDictionary } from '@/i18n/server'
import type { Locale } from '@/i18n/config'
import SectionSheet from '@/components/events/SectionSheet'
import { SectionTabs } from '@/components/ui/section-tabs'

/*
  Creating an event is the Basics of the edit page, laid out on the page: the
  same fields, the same sheet component. Saving lands on /events/[id]/edit,
  where everything else (application, reflection, people) is edited in place.
*/
export default async function NewEvent({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ parent?: string; kind?: string; next?: string }> }) {
  const { locale } = await params
  const { parent: parentParam, kind, next } = await searchParams
  // Only ever send the member back to an events page.
  const back = next && /^\/events\/\d+\/edit(\?[\w=&]*)?$/.test(next) ? next : undefined
  const payload = await getPayload({ config })
  const user = await getCurrentUser(payload)
  if (!user) redirect('/login')
  const t = (await getDictionary(locale)).events

  const parent = parentParam ? await payload.findByID({ collection: 'events', id: parentParam, depth: 1 }).catch(() => null) : null
  if (parentParam ? !parent || parent.event_structure !== 'multi_day' || !canManageEvent(user, parent) : !hasPermission(user, 'manage_events')) notFound()

  const structure: EventStructure = parent ? 'day' : kind === 'multi_day' ? 'multi_day' : 'standalone'
  const [eventTypes, departments, locations] = await Promise.all([findTags(payload, 'event_type'), findTags(payload, 'department'), findTags(payload, 'location')])
  const options = (tags: Awaited<ReturnType<typeof findTags>>, label: (tag: never) => string | null) => tags.map(tag => ({ value: String(tag.id), label: label(tag as never) || String(tag.id) }))
  const values = parent ? { event_type: idOf(parent.event_type), date_begin: parent.date_begin } : {}

  return (
    <>
      <Link href={parent ? back ?? `/events/${parent.id}/edit?tab=sessions` : '/events/manage'} className="text-meta text-muted-foreground hover:text-foreground">← {parent ? t.parent_event : t.manage_events}</Link>
      <h1 className="type-h1 mt-5 mb-6">{parent ? `${t.staff.add_session} · ${parent.name}` : t.new_event}</h1>
      {!parent && (
        <div className="mb-8">
          <SectionTabs label={t.editor.event_structure} value={structure} tabs={[
            { key: 'standalone', label: t.structure.standalone, href: '/events/new' },
            { key: 'multi_day', label: t.structure.multi_day, href: '/events/new?kind=multi_day' },
          ]} />
        </div>
      )}
      <SectionSheet
        key={structure}
        eventId={null}
        title={t.new_event}
        create={{ structure, parentId: parent?.id ?? null, label: t.staff.create_event, next: back }}
        fields={sectionFields('basics', structure)}
        values={values}
        options={{
          event_type: options(eventTypes, tag => tagLabel(tag, locale)),
          department: options(departments, tag => tagLabel(tag, locale)),
          location: options(locations, tag => tagPath(tag, locale)),
        }}
      />
    </>
  )
}
