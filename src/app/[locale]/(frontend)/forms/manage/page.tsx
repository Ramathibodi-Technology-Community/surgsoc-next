import { formManager } from '@/libs/form-management'
import Link from 'next/link'
import { getDictionary } from '@/i18n/server'
import type { Locale } from '@/i18n/config'
import PageHeader from '@/components/PageHeader'
import MiniRecord from '@/components/Record'
import { SectionTabs } from '@/components/ui/section-tabs'
import { Button } from '@/components/ui/button'
import { formatStamp } from '@/libs/utils'
import { formClosedReason } from '@/libs/forms/availability'

export default async function ManageForms({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ scope?: string; q?: string; closed?: string }> }) {
  const { payload, user } = await formManager()
  const { scope, q, closed: showClosed } = await searchParams
  const { locale } = await params
  const all = scope === 'all'
  const query = (q || '').trim()
  const result = await payload.find({ collection: 'forms', where: { and: [...(all ? [] : [{ owner: { equals: user.id } }]), ...(query ? [{ title: { like: query } }] : [])] }, sort: '-updatedAt', pagination: false, depth: 1, overrideAccess: false, user })
  const t = (await getDictionary(locale)).forms.editor
  const ids = result.docs.map(form => form.id)
  const [responses, assignments, events] = await Promise.all([
    Promise.all(ids.map(id => payload.count({ collection: 'form-submissions', where: { form: { equals: id } }, user, overrideAccess: false }))),
    Promise.all(ids.map(id => payload.count({ collection: 'form-assignments', where: { form: { equals: id } }, user, overrideAccess: false }))),
    ids.length ? payload.find({ collection: 'events', where: { or: [{ subscription_form: { in: ids } }, { loa_form: { in: ids } }, { reflection_form: { in: ids } }] }, depth: 0, pagination: false, select: { name: true, subscription_form: true, loa_form: true, reflection_form: true } }) : { docs: [] },
  ])
  // What each form is for, read from the events that point at it: registration, leave request or reflection.
  const kindOf = (formId: number) => {
    const use = events.docs.find(event => [event.subscription_form, event.loa_form, event.reflection_form].some(ref => String(typeof ref === 'object' && ref ? ref.id : ref) === String(formId)))
    if (!use) return { kind: null, event: null }
    const is = (ref: unknown) => String(typeof ref === 'object' && ref ? (ref as { id: number }).id : ref) === String(formId)
    return { kind: is(use.reflection_form) ? t.kind_reflection : is(use.loa_form) ? t.kind_leave : t.kind_registration, event: use.name }
  }
  const rows = result.docs.map((form, index) => {
    const { kind, event } = kindOf(form.id)
    const count = responses[index].totalDocs
    const shut = formClosedReason(form as never, count)
    const group = shut ? 'closed' : kind || assignments[index].totalDocs > 0 ? 'accepting' : 'unused'
    return { form, kind, event, count, assigned: assignments[index].totalDocs, shut, group }
  })
  const groups = [
    { key: 'accepting', title: t.group_accepting, rows: rows.filter(row => row.group === 'accepting') },
    { key: 'unused', title: t.group_unused, rows: rows.filter(row => row.group === 'unused') },
    { key: 'closed', title: t.group_closed, rows: rows.filter(row => row.group === 'closed') },
  ]
  const record = (row: (typeof rows)[number]) => (
    <MiniRecord
      key={row.form.id}
      href={`/forms/${row.form.id}/edit`}
      title={row.form.title}
      sub={[row.kind, row.event].filter(Boolean).join(' · ') || undefined}
      meta={
        <>
          <span>{row.form.fields?.length ?? 0} {t.fields}</span>
          <span className="sep" />
          <span>{row.count} {t.responses}</span>
          {row.assigned > 0 && <><span className="sep" /><span>{row.assigned} {t.assignments}</span></>}
          <span className="sep" />
          <time dateTime={row.form.updatedAt}>{formatStamp(row.form.updatedAt, locale)}</time>
        </>
      }
      status={row.shut ? 'closed' : row.group === 'unused' ? 'draft' : 'accepting'}
      statusLabel={row.shut ? t.closed : row.group === 'unused' ? t.not_used : t.accepting_label}
    />
  )
  return (
    <>
      <PageHeader title={t.manage} lead={t.manage_lead} />
      <div className="mb-6 flex flex-wrap items-start gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <SectionTabs className="mb-0" label={t.manage} value={all ? 'all' : 'my'} tabs={[
            { key: 'my', label: t.my_forms, href: '/forms/manage' },
            { key: 'all', label: t.all_forms, href: '/forms/manage?scope=all' },
          ]} />
        </div>
        <Button asChild><Link href="/forms/new">{t.new_form}</Link></Button>
      </div>
      {!rows.length && <div className="empty-note"><p className="font-medium text-secondary-foreground">{query ? t.no_match : all ? t.no_forms : t.no_my_forms}</p></div>}
      {groups.filter(group => group.rows.length).map(group => {
        // Closed forms are history: collapsed to a count until asked for.
        const collapsed = group.key === 'closed' && showClosed !== '1' && group.rows.length > 3
        return (
          <section key={group.key} className="mb-wide">
            <div className="rail"><h2 className="type-h2">{group.title}</h2><span className="rail-bar" /><span className="type-figure">{group.rows.length}</span></div>
            <div className="flex flex-col gap-2.5">{(collapsed ? group.rows.slice(0, 3) : group.rows).map(record)}</div>
            {collapsed && <Link className="mt-3 inline-block text-accent" href={`/forms/manage?${all ? 'scope=all&' : ''}${query ? `q=${encodeURIComponent(query)}&` : ''}closed=1`}>{t.show_all_closed.replace('{count}', String(group.rows.length))}</Link>}
          </section>
        )
      })}
    </>
  )
}
