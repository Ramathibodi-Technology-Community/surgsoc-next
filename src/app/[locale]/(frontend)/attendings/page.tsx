import React from 'react'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getDictionary } from '@/i18n/server'
import { Locale } from '@/i18n/config'
import PageHeader from '@/components/PageHeader'
import PersonCard from '@/components/PersonCard'
import { tagId, tagLabel, tagOrder, type TagRef } from '@/libs/tags'
import { sampleWhere } from '@/libs/sample-data'
import { getSiteSettings } from '@/libs/site-settings'

export const metadata: Metadata = {
  title: 'Attending Physicians | RASS',
  description: 'Our advisor physicians at Ramathibodi Surgical Society.',
}

function joinName(name?: { first_name?: string; last_name?: string }): string {
  return [name?.first_name, name?.last_name].filter(Boolean).join(' ').trim()
}

/**
 * The Thai name line, with its academic title in front — "ศ.พญ. นัทธยา ชัยพร".
 *
 * The title is read in Thai here even on the `en` page: the Thai name is Thai
 * either way, so `tagLabel` is pinned to the `th` label rather than following
 * `locale` the way the card's English role does. No Thai name means no line at
 * all (PersonCard closes the gap), so a title never renders stranded on its own.
 */
function thaiNameLine(nameThai: string, title?: TagRef): string {
  if (!nameThai) return ''
  const titleTh = tagLabel(title, 'th')
  return titleTh ? `${titleTh} ${nameThai}` : nameThai
}

/**
 * The secretary's trailing line: how to reach them.
 *
 * Email and phone are separated by a gap, not a dot. A dot between two flex
 * items strands itself at the end of the line above when the pair wraps, and an
 * email is exactly long enough for that to happen on a narrow card.
 *
 * Blank contact is a "stated" blank, not a silent one — a card that announces
 * someone as the person to contact and then shows no way to do it looks broken.
 */
function SecretaryContact({ email, phone }: { email?: string | null; phone?: string | null }) {
  if (!email && !phone) {
    return <span className="text-muted-foreground">Contact to be confirmed</span>
  }
  return (
    <span className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
      {email ? (
        <a
          href={`mailto:${email}`}
          className="rounded-[4px] font-medium text-accent transition-colors [overflow-wrap:anywhere] hover:text-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {email}
        </a>
      ) : null}
      {phone ? (
        <a
          href={`tel:${phone.replace(/[^\d+]/g, '')}`}
          className="rounded-[4px] tabular-nums transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {phone}
        </a>
      ) : null}
    </span>
  )
}

type Attending = {
  id: string | number
  specialty?: TagRef
  is_secretary?: boolean | null
  image_url?: string | null
  display_name?: string | null
  title?: TagRef
  name_english?: { first_name?: string; last_name?: string }
  name_thai?: { first_name?: string; last_name?: string }
  contact?: { email?: string | null; phone_number?: string | null }
  sort_order?: number | null
}

export default async function AttendingsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params as { locale: Locale }
  const t = (await getDictionary(locale)).attendings
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'attendings' as any,
    where: { is_visible: { equals: true }, ...sampleWhere((await getSiteSettings()).showSampleData) },
    sort: 'sort_order',
    limit: 200,
  })

  const attendings = docs as unknown as Attending[]

  /*
    Group by specialty, then order the groups by the tag's own `sort_order`
    rather than by name or by count — that order is editorial (broadest first,
    "Other" last) and it is the same order the admin dropdown offers, so what a
    coordinator sees when they file someone is what a reader sees on the page.
    Reordering the page is now a number in the admin panel, not a deploy.

    Records with no specialty fall into their own trailing group rather than
    being dropped: an unfiled physician is still a physician, and silently
    hiding them would make the page lie about the faculty.
  */
  type SpecialtyGroup = { key: string; heading: string; order: number; members: Attending[] }
  const groups = new Map<string, SpecialtyGroup>()

  for (const att of attendings) {
    const id = tagId(att.specialty)
    const key = id === null ? '__unfiled' : String(id)
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        heading: (id === null ? null : tagLabel(att.specialty, locale)) ?? 'Other faculty',
        // Unfiled sorts last, same as "Other" always did.
        order: id === null ? Number.MAX_SAFE_INTEGER : tagOrder(att.specialty),
        members: [],
      })
    }
    groups.get(key)!.members.push(att)
  }

  // Ties are broken by heading so two unordered tags do not swap places
  // between renders.
  const ordered = [...groups.values()].sort(
    (a, b) => a.order - b.order || a.heading.localeCompare(b.heading),
  )

  return (
    <>
      <PageHeader title={t.title} lead={t.subtitle} />

      {attendings.length === 0 ? (
        <div className="empty-note">
          <p className="font-medium text-secondary-foreground">{t.no_attendings}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            {t.admin_dashboard}
          </p>
        </div>
      ) : (
        ordered.map(({ key, heading, members }, index) => {
          /*
            Nothing enforces one secretary per specialty. `find` takes the first
            in `sort_order`, which is the order the query already returned and
            the same rule that orders the grid — so a second flag is a no-op
            rather than a duplicate card.
          */
          const secretary = members.find((m) => m.is_secretary)
          const rest = members.filter((m) => m !== secretary)

          return (
            <section key={key} className={index === ordered.length - 1 ? '' : 'mb-10'}>
              <div className="rail">
                <h2 className="type-h2">{heading}</h2>
                <span className="rail-bar" />
                <span className="meta-mono">{members.length}</span>
              </div>

              {/*
                The secretary is the first card in the grid, not a block above
                it. Same component, same size, same portrait crop as every other
                physician — the only differences are the darker fill and a tag
                that says Secretary where the others say their academic title.
                A separate full-width panel made the one person who is easiest
                to reach look like a different kind of record.
              */}
              <div className="card-grid">
                {secretary ? (
                  <PersonCard
                    key={secretary.id}
                    className="bg-surface"
                    imageUrl={secretary.image_url}
                    /* Secretary *and* their title — the role is why the card
                       leads the section, the title is still who they are, and
                       dropping one to show the other loses a fact for nothing.
                       Falls back to the role alone when there is no title. */
                    role={[t.secretary, tagLabel(secretary.title, locale)]
                      .filter(Boolean)
                      .join(' · ')}
                    name={joinName(secretary.name_english) || secretary.display_name || '—'}
                    nameThai={thaiNameLine(joinName(secretary.name_thai), secretary.title)}
                    meta={
                      <SecretaryContact
                        email={secretary.contact?.email}
                        phone={secretary.contact?.phone_number}
                      />
                    }
                  />
                ) : null}

                {rest.map((att) => (
                  <PersonCard
                    key={att.id}
                    imageUrl={att.image_url}
                    role={tagLabel(att.title, locale) || t.faculty}
                    name={joinName(att.name_english) || att.display_name || '—'}
                    nameThai={thaiNameLine(joinName(att.name_thai), att.title)}
                    /* Title, English name, Thai name — nothing else. The email
                       used to trail here; a roster is read to find a person,
                       and the one card that exists to be contacted is the
                       secretary's, directly above. */
                  />
                ))}
              </div>
            </section>
          )
        })
      )}
    </>
  )
}
