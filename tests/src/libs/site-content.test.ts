import { describe, expect, it } from 'vitest'
import { sanitizeHero, sanitizeHomeLabels } from '@/libs/site-content'

/**
 * The home page hero is the one block on the site with no schema-level
 * `required`, because making an editor retype the title just to change the
 * tagline is worse than a fallback. That trade only holds if every field falls
 * back *independently* — the failure mode is a half-filled global rendering a
 * blank `<h1>`, which looks like an outage rather than a content mistake.
 */
describe('sanitizeHero', () => {
  it('falls back to the built-in copy when the global is empty', () => {
    const hero = sanitizeHero(undefined)
    expect(hero.heading).toBe('Ramathibodi Surgical Society')
    expect(hero.ctas).toHaveLength(2)
  })

  it('keeps the defaults for the fields an editor left blank', () => {
    // The whole point of the per-field fallback: overriding the lead must not
    // wipe the heading beside it.
    const hero = sanitizeHero({ lead: 'A new tagline.' })
    expect(hero.lead).toBe('A new tagline.')
    expect(hero.heading).toBe('Ramathibodi Surgical Society')
  })

  it('treats a whitespace-only field as blank', () => {
    expect(sanitizeHero({ heading: '   ' }).heading).toBe('Ramathibodi Surgical Society')
  })

  it('drops half-filled buttons and falls back when none survive', () => {
    // A row with a label but no href would render a link to nowhere.
    expect(sanitizeHero({ ctas: [{ label: 'Apply' }] }).ctas).toEqual([
      { label: 'Explore events', href: '/events' },
      { label: 'Meet the team', href: '/team' },
    ])
  })

  it('uses the authored buttons when they are complete', () => {
    expect(sanitizeHero({ ctas: [{ label: 'Apply', href: '/events' }] })).toMatchObject({
      ctas: [{ label: 'Apply', href: '/events' }],
    })
  })
})

/**
 * The stat captions and section headings have the same fallback contract as the
 * hero, but a worse failure mode: they sit in heading rails and beside live
 * counts, so a blank one renders a rule with no words on it and a number with
 * nothing saying what it counts — it reads as a broken page, not as missing copy.
 */
describe('sanitizeHomeLabels', () => {
  it('falls back to the built-in wording when the global is empty', () => {
    expect(sanitizeHomeLabels(undefined)).toEqual({
      memberStat: 'Members on the register',
      sessionStat: 'sessions listed',
      advisorStat: 'faculty advisors',
      pendingHeading: 'Needs your attention',
      upcomingHeading: 'Upcoming',
      pastHeading: 'Past sessions',
      pastLink: 'Full archive',
    })
  })

  it('keeps the other six when an editor renames one', () => {
    // The reason these are seven independent fields rather than one blob:
    // renaming a single heading must not blank the ones beside it.
    const labels = sanitizeHomeLabels({ upcomingHeading: 'What is on' })
    expect(labels.upcomingHeading).toBe('What is on')
    expect(labels.pastHeading).toBe('Past sessions')
    expect(labels.memberStat).toBe('Members on the register')
  })

  it('treats a whitespace-only caption as blank', () => {
    // Clearing a field in the admin UI can leave a stray space behind; that is
    // an editor asking for the default back, not for an empty heading.
    expect(sanitizeHomeLabels({ pastLink: '  ' }).pastLink).toBe('Full archive')
  })
})
