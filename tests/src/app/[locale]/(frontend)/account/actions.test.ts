import { beforeEach, describe, expect, it, vi } from 'vitest'

/*
  Track, year and interests are relationships to `tags` now, so the action asks
  the database which ids are legal for each vocabulary before writing. `find`
  answers by kind — which is also what lets the escalation test below prove the
  check is a real one and not just a shape check.
*/
const TAGS = [
  { id: 11, kind: 'track', slug: 'track-md', label: 'M.D.' },
  { id: 12, kind: 'track', slug: 'track-rak', label: 'RAK' },
  { id: 21, kind: 'year', slug: 'year-2', label: 'Year 2' },
  { id: 31, kind: 'event_type', slug: 'type-trauma', label: 'Trauma' },
  { id: 32, kind: 'event_type', slug: 'type-vascular', label: 'Vascular' },
  // A department tag exists but must never be accepted as a year or a track.
  { id: 41, kind: 'department', slug: 'dept-ia', label: 'Internal Affairs' },
]

const payloadMock = {
  auth: vi.fn(),
  update: vi.fn(),
  find: vi.fn(async ({ where }: any) => {
    const kind = where?.and?.[0]?.kind?.equals
    return { docs: TAGS.filter((tag) => tag.kind === kind) }
  }),
}

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({
  getPayload: vi.fn(async () => payloadMock),
}))
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({ mocked: true })),
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

/**
 * `updateProfile` writes a whole user document, and most of its fields have no
 * fallback to the stored value. That makes "which keys end up in the update
 * payload" a data-integrity question, not a cosmetic one: any key that leaks
 * into a save it does not belong to will blank whatever the member had there.
 *
 * The profile is edited one section at a time, so these assert the scoping —
 * each save touches its own fields and provably leaves the other four alone.
 * Without this, a regression here is silent until somebody notices their
 * portfolio is empty.
 */
const EXISTING_USER = {
  id: 7,
  name_thai: { first_name: 'สมชาย', last_name: 'ใจดี', nickname: 'ชาย' },
  name_english: { first_name: 'Somchai', last_name: 'Jaidee', nickname: 'Chai' },
  contact: { phone_number: '02-111-2222', line_id: 'somchai' },
  academic: { student_id: '6500001', track: 11, year: 21 },
  interests: [31, 32],
  portfolio: [{ year: '2025', activity: 'Anatomy camp', role: 'Lead' }],
  social_media: [{ platform: 'IG', handle: '@somchai' }],
}

async function save(fields: Record<string, string | string[]>) {
  payloadMock.auth.mockResolvedValue({ user: EXISTING_USER })
  payloadMock.update.mockResolvedValue({})

  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) value.forEach((v) => formData.append(key, v))
    else formData.set(key, value)
  }

  const { updateProfile } = await import('@/app/[locale]/(frontend)/account/actions')
  const result = await updateProfile(null, formData)
  const payload = payloadMock.update.mock.calls[0]?.[0]
  return { result, data: payload?.data as Record<string, unknown> | undefined }
}

describe('updateProfile section scoping', () => {
  beforeEach(() => {
    payloadMock.auth.mockReset()
    payloadMock.update.mockReset()
    payloadMock.find.mockClear()
  })

  it('refuses a save that does not name a section', async () => {
    const { result } = await save({ first_name_thai: 'X' })
    expect(result.success).toBe(false)
    expect(payloadMock.update).not.toHaveBeenCalled()
  })

  it('refuses an unrecognised section', async () => {
    const { result } = await save({ section: 'everything' })
    expect(result.success).toBe(false)
    expect(payloadMock.update).not.toHaveBeenCalled()
  })

  it('saving personal details leaves contact, academic and the lists untouched', async () => {
    const { result, data } = await save({
      section: 'personal',
      first_name_thai: 'สมชาย',
      last_name_thai: 'ใจดี',
      first_name_english: 'Somchai',
      last_name_english: 'Jaidee',
      nickname_english: 'Chai',
      dob: '2001-04-01',
    })

    expect(result.success).toBe(true)
    expect(Object.keys(data!).sort()).toEqual(['dob', 'name_english', 'name_thai'])
    // The fields that have no fallback in the update — the ones a leak destroys.
    expect(data).not.toHaveProperty('contact')
    expect(data).not.toHaveProperty('academic')
    expect(data).not.toHaveProperty('interests')
    expect(data).not.toHaveProperty('portfolio')
    expect(data).not.toHaveProperty('social_media')
  })

  it('clears a nickname when the member empties it, within its own section', async () => {
    const { data } = await save({ section: 'personal', nickname_thai: '' })
    expect((data!.name_thai as Record<string, unknown>).nickname).toBe('')
  })

  it('lets a date of birth be cleared rather than silently kept', async () => {
    // `undefined` would mean "leave as is", so a mistyped date could never be
    // removed. Within the personal section, empty has to mean empty.
    const { data } = await save({ section: 'personal', dob: '' })
    expect(data!.dob).toBeNull()
  })

  it('saving contact writes contact and social accounts only', async () => {
    const { data } = await save({
      section: 'contact',
      phone_number: '08-123-4567',
      line_id: 'newline',
      social_media_json: JSON.stringify([{ platform: 'X', handle: '@new' }]),
    })

    expect(Object.keys(data!).sort()).toEqual(['contact', 'social_media'])
    expect(data!.contact).toMatchObject({ phone_number: '08-123-4567', line_id: 'newline' })
    expect(data!.social_media).toEqual([{ platform: 'X', handle: '@new' }])
    expect(data).not.toHaveProperty('name_thai')
    expect(data).not.toHaveProperty('portfolio')
  })

  it('does not blank social accounts when the serialised list never arrives', async () => {
    const { data } = await save({ section: 'contact', phone_number: '08-123-4567' })
    expect(data).not.toHaveProperty('social_media')
  })

  it('does not blank the portfolio when the serialised list never arrives', async () => {
    const { data } = await save({ section: 'portfolio' })
    expect(data).not.toHaveProperty('portfolio')
  })

  it('treats an empty interests submission as a real clear, not a missing field', async () => {
    // Unchecking every box sends nothing at all. The section name is the only
    // thing that distinguishes that from "interests were not on screen".
    const { data } = await save({ section: 'interests' })
    expect(Object.keys(data!)).toEqual(['interests'])
    expect(data!.interests).toEqual([])
  })

  it('saving academic leaves names and lists untouched', async () => {
    const { data } = await save({ section: 'academic', student_id: '6500099', track: '12' })
    expect(Object.keys(data!)).toEqual(['academic'])
    expect(data!.academic).toMatchObject({ student_id: '6500099', track: 12 })
  })

  /*
    The escalation this guards against: `syncUserGroups` turns a member's
    department, year and track tags into group membership, and the department
    groups carry `manage_events`. A member who edits the form to post a
    department tag id as their academic year would be handed event management
    on save. Posting a tag of the wrong kind has to be refused outright, not
    quietly dropped.
  */
  it('refuses a tag from the wrong vocabulary rather than writing it', async () => {
    const { result, data } = await save({ section: 'academic', year: '41' })
    expect(result.success).toBe(false)
    expect(data).toBeUndefined()
    expect(payloadMock.update).not.toHaveBeenCalled()
  })

  it('refuses an interest that is not in the vocabulary', async () => {
    const { result } = await save({ section: 'interests', interests: ['31', '999'] })
    expect(result.success).toBe(false)
    expect(payloadMock.update).not.toHaveBeenCalled()
  })

  it('accepts interests that are all in the vocabulary', async () => {
    const { data } = await save({ section: 'interests', interests: ['31', '32'] })
    expect(data!.interests).toEqual([31, 32])
  })

  it('rejects an unauthenticated save before touching the database', async () => {
    payloadMock.auth.mockResolvedValue({ user: null })
    const formData = new FormData()
    formData.set('section', 'personal')

    const { updateProfile } = await import('@/app/[locale]/(frontend)/account/actions')
    const result = await updateProfile(null, formData)

    expect(result).toEqual({ success: false, message: 'Unauthorized' })
    expect(payloadMock.update).not.toHaveBeenCalled()
  })
})

describe('phone validation', () => {
  beforeEach(() => {
    payloadMock.auth.mockReset()
    payloadMock.update.mockReset()
    payloadMock.find.mockClear()
  })

  it.each([
    ['08-123-4567', true],
    ['0812345678', true],
    ['02-000-0000', true],
    ['', true],
  ])('accepts %s', async (phone, ok) => {
    const { result } = await save({ section: 'contact', phone_number: phone })
    expect(result.success).toBe(ok)
  })

  it('names the digit count rather than saying "invalid"', async () => {
    const { result } = await save({ section: 'contact', phone_number: '08-123' })
    expect(result.success).toBe(false)
    expect(result.message).toBe('Needs 9 or 10 digits — this has 5')
  })

  it('says what is wrong when the number does not start with 0', async () => {
    const { result } = await save({ section: 'contact', phone_number: '66812345678' })
    expect(result.success).toBe(false)
    expect(result.message).toBe('Needs to start with 0 — like 08-123-4567')
  })
})
