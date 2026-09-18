'use client'

import { useState } from 'react'
import PersonCard from './PersonCard'
import { getTeamMemberUser, type TeamMemberDoc, type YearRoster } from '@/libs/team-roster'

export default function TeamRoster({
  years,
  rosters,
  defaultYear,
  otherDepartmentLabel,
  leadershipLabel,
  academicYearLabel,
  noMembersText,
  adminDashboardText,
}: {
  years: string[]
  rosters: Record<string, YearRoster>
  defaultYear: string
  /** Heading for members whose user record has no department. */
  otherDepartmentLabel: string
  leadershipLabel: string
  /** e.g. "Academic Year {{year}}" — {{year}} is swapped for the selected year. */
  academicYearLabel: string
  noMembersText: string
  adminDashboardText: string
}) {
  const [year, setYear] = useState(defaultYear)
  const roster = rosters[year]
  const isEmpty = !roster || (roster.leadership.length === 0 && roster.departments.length === 0)

  return (
    <>
      <div className="mb-[34px] flex flex-wrap items-center justify-between gap-3">
        <p className="text-[15px] text-muted-foreground">{academicYearLabel.replace('{{year}}', year)}</p>
        {years.length > 1 && (
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="rounded-full border border-border-strong bg-transparent px-[17px] py-2.5 text-[13px] font-medium leading-none text-secondary-foreground"
          >
            {years.map((y) => (
              <option key={y} value={y} className="bg-surface text-foreground">
                {y}
              </option>
            ))}
          </select>
        )}
      </div>

      {isEmpty ? (
        <div className="border-y border-border py-12 text-center">
          <p className="mb-2 font-medium">{noMembersText}</p>
          <p className="text-sm text-muted-foreground">{adminDashboardText}</p>
        </div>
      ) : (
        <>
          {roster.leadership.length > 0 && (
            <TeamSection title={leadershipLabel} members={roster.leadership} />
          )}
          {roster.departments.map((dept) => (
            <TeamSection
              key={dept.key}
              title={dept.label ?? otherDepartmentLabel}
              members={dept.members}
            />
          ))}
        </>
      )}
    </>
  )
}

function TeamSection({ title, members }: { title: string; members: TeamMemberDoc[] }) {
  return (
    <section className="mb-[34px]">
      <div className="rail">
        <h2 className="type-h2">{title}</h2>
        <span className="rail-bar" />
        <span className="meta-mono">{members.length}</span>
      </div>
      {/*
        Records, not a poster grid. A department with two people and one with
        nine now read as the same system rather than two broken grids.
      */}
      <div className="card-grid">
        {members.map((m) => {
          const user = getTeamMemberUser(m)
          return (
            <PersonCard
              key={m.id}
              imageUrl={user?.image_url}
              role={m.position}
              name={
                [user?.name_english?.first_name, user?.name_english?.last_name].filter(Boolean).join(' ') ||
                'Unknown'
              }
              nameThai={[user?.name_thai?.first_name, user?.name_thai?.last_name].filter(Boolean).join(' ')}
              nickname={user?.nickname}
            />
          )
        })}
      </div>
    </section>
  )
}
