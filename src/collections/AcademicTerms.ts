import type { CollectionConfig } from 'payload'

/**
 * One row per club term ("2026-2027"). Deliberately separate from `Tags` —
 * Tags already has a `year` kind for student class year (Y1-Y6), and stacking
 * this alongside it under one generic label list reads as the same thing.
 *
 * No start/end date fields: the club term runs a fixed Oct 1 - Sep 30
 * (`libs/academic-term.ts`), so the label is the only data that varies.
 *
 * No human create/update access, on purpose: the only valid label is
 * whatever `ensureAcademicTermTag` computes from the real date. Letting
 * anyone type a label here invites drift ("2026-27" vs "2026-2027") and a
 * yearly chore that isn't needed — `ensureAcademicTermTag` (called via
 * `overrideAccess: true`) creates the row the first time it's needed, on
 * reconciliation or on adding this year's first team member.
 */
export const AcademicTerms: CollectionConfig = {
  slug: 'academic-terms',
  labels: { singular: 'Academic Term', plural: 'Academic Terms' },
  admin: {
    useAsTitle: 'label',
    group: 'Utilities',
    description: 'System-managed — created automatically as each term begins. Read-only here.',
  },
  access: {
    read: ({ req: { user } }) => Boolean(user),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'label', type: 'text', required: true, admin: { readOnly: true } },
    { name: 'slug', type: 'text', required: true, unique: true, admin: { readOnly: true } },
  ],
}
