import React from 'react'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getDictionary } from '@/i18n/server'
import { Locale } from '@/i18n/config'
import PageHeader from '@/components/PageHeader'
import TeamRoster from '@/components/TeamRoster'
import { groupByYear, buildYearRoster, type TeamMemberDoc, type YearRoster } from '@/libs/team-roster'

export const metadata: Metadata = {
  title: 'Our Team | RASS',
  description: 'Meet the staff of Ramathibodi Surgical Society, past and present.',
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params as { locale: Locale }
  const t = (await getDictionary(locale)).team
  const payload = await getPayload({ config })

  const { docs: members } = await payload.find({
    collection: 'team-members' as any,
    sort: '-academic_year,sort_order',
    depth: 2,
    limit: 1000,
  })

  const docs = members as TeamMemberDoc[]
  const { years, byYear } = groupByYear(docs)
  const rosters: Record<string, YearRoster> = {}
  for (const year of years) rosters[year] = buildYearRoster(byYear.get(year) || [], locale)

  const currentMember = docs.find((m) => m.is_current)
  const defaultYear = currentMember ? String(currentMember.academic_year || years[0]) : years[0]

  return (
    <>
      <PageHeader title={t.title} lead={t.subtitle} />

      {years.length === 0 ? (
        <div className="border-y border-border py-12 text-center">
          <p className="mb-2 font-medium">{t.no_members}</p>
          <p className="text-sm text-muted-foreground">{t.admin_dashboard}</p>
        </div>
      ) : (
        <TeamRoster
          years={years}
          rosters={rosters}
          defaultYear={defaultYear}
          otherDepartmentLabel={t.other_department}
          leadershipLabel="Leadership"
          academicYearLabel={t.academic_year}
          noMembersText={t.no_members}
          adminDashboardText={t.admin_dashboard}
        />
      )}
    </>
  )
}
