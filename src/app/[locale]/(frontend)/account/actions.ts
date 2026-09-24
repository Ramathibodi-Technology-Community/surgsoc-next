'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { User } from '@/payload-types'
import { findTags } from '@/libs/tags'

const profileSchema = z.object({
  nickname_thai: z.string().max(50).optional().default(''),
  nickname_english: z.string().max(50).optional().default(''),
  first_name_thai: z.string().max(100).optional().default(''),
  last_name_thai: z.string().max(100).optional().default(''),
  first_name_english: z.string().max(100).optional().default(''),
  last_name_english: z.string().max(100).optional().default(''),
  /*
    "Invalid phone format" told a member their number was wrong and nothing
    else. Errors name the number: how many digits are needed, how many they
    typed. Thai numbers run 9 digits for a landline (02-xxx-xxxx) and 10 for a
    mobile (08x-xxx-xxxx), and separators are optional either way.
  */
  phone_number: z
    .string()
    .optional()
    .default('')
    .superRefine((value, ctx) => {
      if (!value) return
      const digits = value.replace(/\D/g, '')
      if (/^0\d{8,9}$/.test(digits)) return
      ctx.addIssue({
        code: 'custom',
        message: !digits.startsWith('0')
          ? 'Needs to start with 0 — like 08-123-4567'
          : `Needs 9 or 10 digits — this has ${digits.length}`,
      })
    }),
  line_id: z.string().max(50).optional().default(''),
  dob: z.string().refine(v => !v || !isNaN(Date.parse(v)), 'Invalid date').optional().default(''),
  /*
    Track, year and interests are relationships to `tags`, so the form posts tag
    ids as strings. The allowed set is not a literal any more — it is rows in
    the database — so zod only checks the shape here and `resolveTagIds` below
    checks membership against the right vocabulary.
  */
  track: z.string().optional().default(''),
  year: z.string().optional().default(''),
  student_id: z.string().max(20).refine(v => !v || /^\d{7}$/.test(v), 'Student ID must be exactly 7 digits').optional().default(''),
  interests: z.array(z.string()).optional().default([]),
  portfolio: z.array(z.object({
    year: z.string(),
    activity: z.string().max(200),
    role: z.string().max(200).optional().default(''),
  })).max(20).optional().default([]),
  social_media: z.array(z.object({
    platform: z.string().max(50),
    handle: z.string().max(200),
  })).max(10).optional().default([]),
})

/**
 * The profile is edited one section at a time, so every save says which section
 * it is.
 *
 * This matters more than it looks. The update below writes a whole user
 * document, and most of its fields have no fallback — `nickname`, `line_id`,
 * `interests`, `portfolio` and `social_media` are written straight from the
 * parsed form. A partial submission would therefore not be partial at all: it
 * would blank every field that happened not to be on screen. Saving "Personal
 * information" would quietly erase the member's phone number, their interests
 * and their entire portfolio.
 *
 * Scoping by section is what makes the save safe. It also resolves an ambiguity
 * that inspecting the FormData alone cannot: an unchecked checkbox group sends
 * nothing, so an absent `interests` is indistinguishable from "the member
 * deselected them all" — unless the request states which section it is for.
 */
const SECTIONS = ['personal', 'academic', 'contact', 'portfolio', 'interests'] as const

/**
 * Turns posted tag ids into numbers, rejecting anything outside `kind`.
 *
 * This is a trust boundary, not a formality. `syncUserGroups` turns a member's
 * department, year and track tags into group membership, and the department
 * groups carry `manage_events`. Without the kind check a member could post
 * their academic year as the id of the `dept-ia` tag and be handed event
 * management on the next save. The field's `filterOptions` constrains the
 * admin panel and the REST API; this constrains the one path that bypasses
 * both — a server action writing on the member's behalf.
 *
 * Returns null on any unknown id, so a tampered form fails loudly instead of
 * silently dropping the bad value and saving the rest.
 */
async function resolveTagIds(
  payload: Parameters<typeof findTags>[0],
  kind: string,
  raw: string[],
): Promise<number[] | null> {
  const ids = raw.filter(Boolean).map(Number)
  if (ids.length === 0) return []
  if (ids.some((id) => !Number.isInteger(id))) return null

  const allowed = new Set((await findTags(payload, kind)).map((tag) => Number(tag.id)))
  return ids.every((id) => allowed.has(id)) ? ids : null
}
export type ProfileSection = (typeof SECTIONS)[number]

export async function updateProfile(prevState: { success: boolean; message: string } | null, formData: FormData) {
  const payload = await getPayload({ config })
  const headersList = await headers()
  const { user } = await payload.auth({ headers: headersList })

  if (!user) {
    return { success: false, message: 'Unauthorized' }
  }

  const section = String(formData.get('section') || '') as ProfileSection
  if (!SECTIONS.includes(section)) {
    return { success: false, message: 'Unknown profile section' }
  }

  try {
    // Parse JSON fields
    let rawPortfolio: unknown[] = []
    const portfolioJson = formData.get('portfolio_json')
    if (typeof portfolioJson === 'string' && portfolioJson) {
      try { rawPortfolio = JSON.parse(portfolioJson) } catch { /* ignore */ }
    }

    let rawSocialMedia: unknown[] = []
    const socialMediaJson = formData.get('social_media_json')
    if (typeof socialMediaJson === 'string' && socialMediaJson) {
      try { rawSocialMedia = JSON.parse(socialMediaJson) } catch { /* ignore */ }
    }

    const parsed = profileSchema.safeParse({
      nickname_thai: formData.get('nickname_thai') || '',
      nickname_english: formData.get('nickname_english') || '',
      first_name_thai: formData.get('first_name_thai') || '',
      last_name_thai: formData.get('last_name_thai') || '',
      first_name_english: formData.get('first_name_english') || '',
      last_name_english: formData.get('last_name_english') || '',
      phone_number: formData.get('phone_number') || '',
      line_id: formData.get('line_id') || '',
      dob: formData.get('dob') || '',
      track: formData.get('track') || '',
      year: formData.get('year') || '',
      student_id: formData.get('student_id') || '',
      interests: formData.getAll('interests'),
      portfolio: rawPortfolio,
      social_media: rawSocialMedia,
    })

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return { success: false, message: firstError?.message || 'Validation failed' }
    }

    const d = parsed.data

    /*
      Only the named section's fields go into `data`. Anything absent from this
      object is not written at all, which is what keeps the other four sections
      untouched — Payload leaves a field it was not given alone.
    */
    const data: Record<string, unknown> = {}

    switch (section) {
      case 'personal':
        data.name_thai = {
          ...user.name_thai,
          // Names keep their fallback: they are required, and a blank submit is
          // far more likely to be an accident than an intent to have no name.
          first_name: d.first_name_thai || user.name_thai?.first_name || '',
          last_name: d.last_name_thai || user.name_thai?.last_name || '',
          nickname: d.nickname_thai,
        }
        data.name_english = {
          ...user.name_english,
          first_name: d.first_name_english || user.name_english?.first_name || '',
          last_name: d.last_name_english || user.name_english?.last_name || '',
          nickname: d.nickname_english,
        }
        // `undefined` would mean "leave as is", so a member could never clear a
        // date they had set by mistake. Within this section, empty means empty.
        data.dob = d.dob || null
        break

      case 'academic': {
        const [track, year] = await Promise.all([
          resolveTagIds(payload, 'track', [d.track]),
          resolveTagIds(payload, 'year', [d.year]),
        ])
        if (track === null || year === null) {
          return { success: false, message: 'Unrecognised track or year.' }
        }

        data.academic = {
          ...user.academic,
          student_id: d.student_id || user.academic?.student_id || '',
          track: (track[0] ?? null) as never,
          year: (year[0] ?? null) as never,
        }
        break
      }

      case 'contact':
        data.contact = {
          ...user.contact,
          phone_number: d.phone_number,
          line_id: d.line_id,
        }
        // Belt and braces alongside the section check: the repeatable lists are
        // serialised into a hidden field by the client, and writing `[]`
        // because that field never arrived would empty the list.
        if (formData.has('social_media_json')) {
          data.social_media = d.social_media as NonNullable<User['social_media']>
        }
        break

      case 'portfolio':
        if (formData.has('portfolio_json')) {
          data.portfolio = d.portfolio as NonNullable<User['portfolio']>
        }
        break

      case 'interests': {
        // No `formData.has` guard here, and deliberately: an empty array is a
        // real edit. The section discriminator is what makes that unambiguous.
        const interests = await resolveTagIds(payload, 'event_type', d.interests)
        if (interests === null) {
          return { success: false, message: 'Unrecognised interest.' }
        }
        data.interests = interests as NonNullable<User['interests']>
        break
      }
    }

    await payload.update({
      collection: 'users',
      id: user.id,
      data,
    })

    revalidatePath('/account')
    return { success: true, message: 'Profile updated successfully' }

  } catch (error) {
    console.error('Update profile error:', error)
    return { success: false, message: 'Failed to update profile' }
  }
}
