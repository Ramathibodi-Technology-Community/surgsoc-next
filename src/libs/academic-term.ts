import type { Payload } from 'payload'

/**
 * The club's term runs Oct 1 – Sep 30, fixed regardless of any university
 * cohort's own term dates. A pure function rather than configurable data
 * because the cutoff itself doesn't vary — only the label does.
 */
export function currentAcademicTermLabel(now = new Date()): string {
  const year = now.getFullYear()
  return now.getMonth() >= 9 /* Oct */ ? `${year}-${year + 1}` : `${year - 1}-${year}`
}

/**
 * Find-or-create the shared `academic-terms` row for a term label, e.g.
 * "2026-2027" — the single reference other collections (FormAssignments,
 * Forms, TeamMembers) point at for "which term is this".
 */
export async function ensureAcademicTermTag(payload: Payload, now = new Date(), req?: any) {
  const label = currentAcademicTermLabel(now)
  const existing = await payload.find({
    collection: 'academic-terms',
    where: { slug: { equals: label } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  if (existing.docs[0]) return existing.docs[0]
  return payload.create({
    collection: 'academic-terms',
    overrideAccess: true,
    req,
    data: { slug: label, label },
  })
}
