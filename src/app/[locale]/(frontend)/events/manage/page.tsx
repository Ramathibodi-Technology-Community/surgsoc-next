import { getPayload } from 'payload'
import config from '@payload-config'
import { getCurrentUser } from '@/libs/auth/current-user'
import { hasPermission } from '@/libs/permissions'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getDictionary } from '@/i18n/server'
import type { Locale } from '@/i18n/config'
import NewEventDialog from '@/components/events/NewEventDialog'
import PageHeader from '@/components/PageHeader'
import StatusMark from '@/components/StatusMark'
import MiniRecord from '@/components/Record'
import { Button } from '@/components/ui/button'
import { formatStamp } from '@/libs/utils'

export default async function ManageEvents({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params
  const payload = await getPayload({ config })
  const user = await getCurrentUser(payload)
  if (!user) redirect('/login')
  const manager = hasPermission(user, 'manage_events')
  const events = await payload.find({ collection: 'events', where: { and: [{ parent_event: { exists: false } }, ...(manager ? [] : [{ owner: { equals: user.id } }])] }, sort: '-date_begin', pagination: false, depth: 0 })
  if (!manager && !events.totalDocs) notFound()
  const t = (await getDictionary(locale)).events
  const counts = await Promise.all(events.docs.map(event => payload.count({ collection: 'registrations', where: event.event_structure === 'multi_day' ? { 'event.parent_event': { equals: event.id } } : { event: { equals: event.id } } })))
  return (
    <>
      <PageHeader
        title={t.manage_events}
        aside={manager ? <NewEventDialog variant="default" /> : undefined}
      />
      <div className="flex flex-col gap-2.5">
        {events.docs.map((event, index) => (
          <MiniRecord
            key={event.id}
            href={`/events/${event.id}/edit`}
            title={event.name}
            tag={(t.structure as Record<string, string>)[event.event_structure || 'standalone']}
            meta={
              <>
                <time dateTime={event.date_begin}>{formatStamp(event.date_begin, locale)}</time>
                <span className="sep" />
                <span>{counts[index].totalDocs} {t.applicants.registrations_for}</span>
                <span className="sep" />
                <StatusMark status={event.is_visible ? 'published' : 'draft'} label={event.is_visible ? t.published : t.hidden} />
              </>
            }
            imageUrl={event.image_url || null}
          />
        ))}
      </div>
    </>
  )
}
