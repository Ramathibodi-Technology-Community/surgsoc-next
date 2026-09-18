import config from '@payload-config'
import { getPayload } from 'payload'

type HeroCTA = {
  label: string
  href: string
}

type Hero = {
  eyebrow: string
  heading: string
  subheading: string
  lead: string
  imageUrl: string
  ctas: HeroCTA[]
}

type HomeLabels = {
  memberStat: string
  sessionStat: string
  advisorStat: string
  pendingHeading: string
  upcomingHeading: string
  pastHeading: string
  pastLink: string
}

type HomeSection = {
  kicker?: string
  heading: string
  body: string
  imageUrl?: string
}

type TermsSection = {
  title: string
  content: string
}

const DEFAULT_HERO: Hero = {
  eyebrow: 'Est. 2014 \u00b7 Faculty of Medicine, Mahidol University',
  heading: 'Ramathibodi Surgical Society',
  subheading: '\u0e0a\u0e21\u0e23\u0e21\u0e28\u0e31\u0e25\u0e22\u0e28\u0e32\u0e2a\u0e15\u0e23\u0e4c \u0e23\u0e32\u0e21\u0e32\u0e18\u0e34\u0e1a\u0e14\u0e35',
  lead: 'A home for learners and leaders in surgery, built around excellence, service, and collaboration.',
  imageUrl: '/assets/beta.jpg',
  ctas: [
    { label: 'Explore events', href: '/events' },
    { label: 'Meet the team', href: '/team' },
  ],
}

const DEFAULT_HOME_LABELS: HomeLabels = {
  memberStat: 'Members on the register',
  sessionStat: 'sessions listed',
  advisorStat: 'faculty advisors',
  pendingHeading: 'Needs your attention',
  upcomingHeading: 'Upcoming',
  pastHeading: 'Past sessions',
  pastLink: 'Full archive',
}

const DEFAULT_HOME_SECTIONS: HomeSection[] = [
  {
    kicker: 'About The Society',
    heading: 'Where Passion, Determination, and Teamwork Forge the Future',
    body: 'Ramathibodi Surgical Society is a student-driven community dedicated to growth in surgical knowledge, collaboration, and service.',
    imageUrl: '/assets/beta.jpg',
  },
]

const DEFAULT_TERMS_SECTIONS: TermsSection[] = [
  {
    title: 'Use of Platform',
    content: 'By using this platform, you agree to participate responsibly and comply with applicable society and university policies.',
  },
  {
    title: 'Privacy and Data',
    content: 'We collect and use personal data only for account access, event participation, and internal operational purposes.',
  },
  {
    title: 'Your Rights',
    content: 'You may request correction or removal of personal information by contacting the Ramathibodi Surgical Society administrators.',
  },
]

function isMissingRelationError(error: unknown, relationName: 'home_content' | 'terms_content'): boolean {
  const e = error as {
    message?: string
    code?: string
    cause?: {
      code?: string
      message?: string
    }
  }

  const code = e?.code || e?.cause?.code || ''
  if (code === '42P01') {
    return true
  }

  const message = `${e?.message || ''} ${e?.cause?.message || ''}`.toLowerCase()
  return message.includes('does not exist') && message.includes(relationName)
}

/** Trimmed string, or the default when the field is blank — a cleared field falls back. */
function textOr(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

/*
  Every hero field falls back independently. An editor who only wants to change
  the tagline should not have to retype the title and both buttons to keep them,
  and a half-filled hero should never render a blank headline.
*/
export function sanitizeHero(raw: unknown): Hero {
  const hero = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>

  const ctas = Array.isArray(hero.ctas)
    ? (hero.ctas
        .filter((item) => item && typeof item === 'object')
        .map((item) => {
          const cta = item as Record<string, unknown>
          const label = typeof cta.label === 'string' ? cta.label.trim() : ''
          const href = typeof cta.href === 'string' ? cta.href.trim() : ''
          return label && href ? { label, href } : null
        })
        .filter(Boolean) as HeroCTA[])
    : []

  return {
    eyebrow: textOr(hero.eyebrow, DEFAULT_HERO.eyebrow),
    heading: textOr(hero.heading, DEFAULT_HERO.heading),
    subheading: textOr(hero.subheading, DEFAULT_HERO.subheading),
    lead: textOr(hero.lead, DEFAULT_HERO.lead),
    imageUrl: textOr(hero.imageUrl, DEFAULT_HERO.imageUrl),
    ctas: ctas.length > 0 ? ctas : DEFAULT_HERO.ctas,
  }
}

/*
  Same per-field fallback as the hero, for the same reason: these are the page's
  structural headings, so a blank one leaves a heading rail with no words in it.
  Renaming "Upcoming" must not silently blank the six labels beside it.
*/
export function sanitizeHomeLabels(raw: unknown): HomeLabels {
  const labels = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>

  return {
    memberStat: textOr(labels.memberStat, DEFAULT_HOME_LABELS.memberStat),
    sessionStat: textOr(labels.sessionStat, DEFAULT_HOME_LABELS.sessionStat),
    advisorStat: textOr(labels.advisorStat, DEFAULT_HOME_LABELS.advisorStat),
    pendingHeading: textOr(labels.pendingHeading, DEFAULT_HOME_LABELS.pendingHeading),
    upcomingHeading: textOr(labels.upcomingHeading, DEFAULT_HOME_LABELS.upcomingHeading),
    pastHeading: textOr(labels.pastHeading, DEFAULT_HOME_LABELS.pastHeading),
    pastLink: textOr(labels.pastLink, DEFAULT_HOME_LABELS.pastLink),
  }
}

function sanitizeHomeSections(raw: unknown): HomeSection[] {
  if (!Array.isArray(raw)) return DEFAULT_HOME_SECTIONS

  const sections = raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const section = item as Record<string, unknown>
      const heading = typeof section.heading === 'string' ? section.heading.trim() : ''
      const body = typeof section.body === 'string' ? section.body.trim() : ''

      if (!heading || !body) return null

      return {
        kicker: typeof section.kicker === 'string' ? section.kicker : undefined,
        heading,
        body,
        imageUrl: typeof section.imageUrl === 'string' ? section.imageUrl : undefined,
      }
    })
    .filter(Boolean) as HomeSection[]

  return sections.length > 0 ? sections : DEFAULT_HOME_SECTIONS
}

function sanitizeTermsSections(raw: unknown): TermsSection[] {
  if (!Array.isArray(raw)) return DEFAULT_TERMS_SECTIONS

  const sections = raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const section = item as Record<string, unknown>
      const title = typeof section.title === 'string' ? section.title.trim() : ''
      const content = typeof section.content === 'string' ? section.content.trim() : ''

      if (!title || !content) return null

      return { title, content }
    })
    .filter(Boolean) as TermsSection[]

  return sections.length > 0 ? sections : DEFAULT_TERMS_SECTIONS
}

export async function getHomeContent() {
  const payload = await getPayload({ config })
  let global: Record<string, unknown> = {}

  try {
    global = (await (payload as any).findGlobal({
      slug: 'home-content',
      depth: 0,
      overrideAccess: true,
    })) as Record<string, unknown>
  } catch (error) {
    // During rollout, globals tables may not exist yet; use baked defaults instead of crashing.
    if (!isMissingRelationError(error, 'home_content')) {
      throw error
    }
  }

  return {
    hero: sanitizeHero(global?.hero),
    labels: sanitizeHomeLabels(global?.labels),
    sections: sanitizeHomeSections(global?.sections),
  }
}

export async function getTermsContent() {
  const payload = await getPayload({ config })
  let global: Record<string, unknown> = {}

  try {
    global = (await (payload as any).findGlobal({
      slug: 'terms-content',
      depth: 0,
      overrideAccess: true,
    })) as Record<string, unknown>
  } catch (error) {
    // During rollout, globals tables may not exist yet; use baked defaults instead of crashing.
    if (!isMissingRelationError(error, 'terms_content')) {
      throw error
    }
  }

  return {
    intro:
      typeof global?.intro === 'string' && global.intro.trim().length > 0
        ? global.intro
        : 'This page unifies terms of use and privacy commitments. Continued use of the platform means you agree to these policies.',
    sections: sanitizeTermsSections(global?.sections),
  }
}
