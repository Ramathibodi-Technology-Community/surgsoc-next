#!/usr/bin/env node
// @ts-nocheck — payload-types.ts may be stale; regenerate via `pnpm run generate:types`

/**
 * Dev Seed — full-coverage test data.
 *
 * seed-db.ts gives the minimum a working install needs. This adds one row for
 * every state a feature can be in (every registration status, every form
 * open/closed reason, every event phase) so dev can exercise all of it without
 * hand-building rows in the admin panel.
 *
 * All dates are relative to run time, so re-running keeps the fixtures fresh.
 * Idempotent — keyed on a natural unique field per collection.
 *
 * Runs automatically as part of `pnpm run db:seed` / `db:refresh`.
 */

import { getPayloadInstance, seedAdminEmail, seedPassword } from './shared.js'
import type { Payload } from 'payload'
import { upsertTag, tagIdsBySlug } from './seed-tags.js'

// Registration/assignment hooks fire real notification emails. A dev .env holds
// a dummy Resend key, so every seeded status change would burn a failing HTTP
// round-trip. Unsetting it makes sendEmail() short-circuit with a log line.
delete process.env.RESEND_API_KEY

/** ms offsets from now — keeps every fixture in a predictable phase. */
const at = (days: number, hours = 0) =>
  new Date(Date.now() + days * 86_400_000 + hours * 3_600_000).toISOString()

/** Minimal Lexical document — the runtime shape Payload's richText fields store. */
const rich = (...paragraphs: string[]) => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children: paragraphs.map((text) => ({
      type: 'paragraph',
      version: 1,
      format: '',
      indent: 0,
      direction: 'ltr',
      children: [{ type: 'text', version: 1, text, format: 0, detail: 0, mode: 'normal', style: '' }],
    })),
  },
})

/**
 * Collections carrying `is_sample` (see libs/sample-data.ts).
 *
 * Stamped here rather than on each of the ~40 fixtures below: every dev
 * fixture is by definition sample data, and a flag you have to remember to add
 * is a flag that eventually gets forgotten on the one record that matters.
 */
const SAMPLE_FLAGGED = new Set(['users', 'events', 'attendings'])

/** find-or-create keyed on `where`. Returns the doc id either way. */
async function upsert(
  payload: Payload,
  collection: string,
  where: Record<string, unknown>,
  data: Record<string, unknown>,
  label: string,
) {
  const existing = await payload.find({ collection, where, limit: 1, overrideAccess: true, depth: 0 })
  if (existing.totalDocs > 0) {
    console.log(`   ℹ️  ${label} (exists)`)
    return existing.docs[0].id
  }
  const doc = await payload.create({
    collection,
    data: SAMPLE_FLAGGED.has(collection) ? { ...data, is_sample: true } : data,
    overrideAccess: true,
  })
  console.log(`   ✅ ${label}`)
  return doc.id
}

export async function seedDevData(payloadInstance?: Payload) {
  // Fail before any writes, not mid-seed with half the data already inserted.
  const adminEmail = seedAdminEmail()

  const payload = payloadInstance || (await getPayloadInstance())

  console.log('\n────────────────────────────────────────')
  console.log('🧪 Seeding dev fixtures (full feature coverage)...')

  const idOf = async (collection: string, where: Record<string, unknown>) => {
    const res = await payload.find({ collection, where, limit: 1, overrideAccess: true, depth: 0 })
    return res.docs[0]?.id ?? null
  }

  // Slug → id for the vocabulary seed-db.ts laid down, so the fixtures below
  // read as slugs rather than as ids nobody can check by eye.
  const tag = await tagIdsBySlug(payload)

  // ── Locations ────────────────────────────────────
  // Rooms only. Both campuses are real vocabulary now and come from
  // seed-tags.ts; campusShort() abbreviates CNMI/PYT on event cards, so the
  // fixtures below hang a venue off each to show it.
  console.log('\n📍 Extra Locations...')
  const cnmiLab = await upsertTag(payload, {
    kind: 'location', slug: 'loc-cnmi-sim-lab', label: 'CNMI Building, Simulation Lab', parent: tag['loc-cnmi'],
  })
  const phayathai = await upsertTag(payload, {
    kind: 'location', slug: 'loc-pyt-auditorium', label: 'Faculty of Medicine, Auditorium', parent: tag['loc-pyt'],
  })
  const theatre4 = await upsertTag(payload, {
    kind: 'location', slug: 'loc-rama-ot4', label: 'Surgical Wing, Operating Theatre 4', parent: tag['loc-pyt'],
  })
  const onlineLoc = tag['loc-online']

  // ── Academic titles ──────────────────────────────
  // All eight gendered ranks ship in seed-tags.ts now; nothing extra to mint.
  const titleProf = tag['title-prof-m']
  const titleProfF = tag['title-prof-f']
  const titleAssoc = tag['title-assoc-prof-m']
  const titleAsst = tag['title-asst-prof-m']
  const titleLecturer = tag['title-lecturer-m']

  // ── Attendings ───────────────────────────────────
  // One per specialty group + one hidden row to prove the is_visible filter.
  console.log('\n🩺 Extra Attendings...')
  const attendings = [
    {
      name_english: { first_name: 'Nattaya', last_name: 'Chaiyaporn' },
      name_thai: { first_name: 'นัทธยา', last_name: 'ชัยพร' },
      title: titleProfF,
      specialty: tag['spec-neurosurgery'],
      is_visible: true,
      sort_order: 2,
      image_url: '/assets/beta.jpg',
      contact: { phone_number: '02-000-0000' },
      bio: rich(
        'Professor of Neurosurgery with a focus on minimally invasive skull-base approaches.',
        'Runs the weekly neurosurgical grand rounds open to all pre-clinical students.',
      ),
    },
    {
      name_english: { first_name: 'Anan', last_name: 'Thavornwong' },
      name_thai: { first_name: 'อนันต์', last_name: 'ถาวรวงศ์' },
      title: titleAsst,
      specialty: tag['spec-breast-endocrine'],
      is_visible: true,
      sort_order: 3,
      bio: rich('Assistant Professor, orthopedic trauma and joint reconstruction.'),
    },
    {
      name_english: { first_name: 'Siriwan', last_name: 'Pongpat' },
      name_thai: { first_name: 'ศิริวรรณ', last_name: 'พงศ์พัฒน์' },
      title: titleAssoc,
      specialty: tag['spec-pediatric'],
      is_visible: true,
      sort_order: 4,
      bio: rich('Associate Professor of Pediatric Surgery; neonatal surgical care.'),
    },
    {
      name_english: { first_name: 'Chaiwat', last_name: 'Boonmee' },
      name_thai: { first_name: 'ชัยวัฒน์', last_name: 'บุญมี' },
      title: titleLecturer,
      specialty: tag['spec-trauma-critical-care'],
      is_visible: true,
      sort_order: 5,
      bio: rich('Lecturer in Trauma Surgery, ATLS instructor.'),
    },
    {
      name_english: { first_name: 'Hidden', last_name: 'Attending' },
      name_thai: { first_name: 'ซ่อน', last_name: 'อาจารย์' },
      title: titleProf,
      specialty: tag['spec-urology'],
      is_visible: false, // exercises the is_visible read filter
      sort_order: 99,
      bio: rich('Not shown on the public attendings page — visible to content managers only.'),
    },
  ]
  for (const att of attendings) {
    await upsert(
      payload,
      'attendings',
      {
        and: [
          { 'name_english.first_name': { equals: att.name_english.first_name } },
          { 'name_english.last_name': { equals: att.name_english.last_name } },
        ],
      },
      att,
      `${att.name_english.first_name} ${att.name_english.last_name}${att.is_visible ? '' : ' (hidden)'}`,
    )
  }

  // ── Users ────────────────────────────────────────
  // Every role, plus a deliberately-incomplete visitor to test the profile gate
  // (Users.beforeChange rejects incomplete profiles for any non-visitor role).
  console.log('\n👤 Extra Users...')
  const newUsers = [
    {
      email: 'vp.ia@test.com',
      roles: ['vp'],
      department: tag['dept-ia'],
      name_english: { first_name: 'Vipa', last_name: 'Intara', nickname: 'Vip' },
      name_thai: { first_name: 'วิภา', last_name: 'อินทรา', nickname: 'วิป' },
      academic: { student_id: '6500010', year: tag['year-5'], track: tag['track-md'] },
    },
    {
      email: 'deputy.ea@test.com',
      roles: ['deputy_vp'],
      department: tag['dept-ea'],
      name_english: { first_name: 'Dech', last_name: 'Ekkasit', nickname: 'Dee' },
      name_thai: { first_name: 'เดช', last_name: 'เอกสิทธิ์', nickname: 'ดี' },
      academic: { student_id: '6500011', year: tag['year-4'], track: tag['track-md-mm'] },
    },
    {
      email: 'probation.cc@test.com',
      roles: ['staff_probation'],
      department: tag['dept-pr'],
      name_english: { first_name: 'Ploy', last_name: 'Chanrit', nickname: 'Ploy' },
      name_thai: { first_name: 'พลอย', last_name: 'จันทร์ฤทธิ์', nickname: 'พลอย' },
      academic: { student_id: '6500012', year: tag['year-2'], track: tag['track-md'] },
    },
    {
      // Visitor only — no Thai name, no student ID. This is the account that
      // should be pushed through the "complete your profile" flow.
      email: 'visitor@test.com',
      roles: ['visitor'],
      name_english: { first_name: 'New', last_name: 'Visitor' },
    },
    {
      email: 'member2@test.com',
      roles: ['member'],
      name_english: { first_name: 'Bee', last_name: 'Sudarat', nickname: 'Bee' },
      name_thai: { first_name: 'บี', last_name: 'สุดารัตน์', nickname: 'บี' },
      academic: { student_id: '6500020', year: tag['year-1'], track: tag['track-md'] },
    },
    {
      email: 'member3@test.com',
      roles: ['member'],
      name_english: { first_name: 'Cat', last_name: 'Kanya', nickname: 'Cat' },
      name_thai: { first_name: 'แคท', last_name: 'กัญญา', nickname: 'แคท' },
      academic: { student_id: '6500021', year: tag['year-2'], track: tag['track-md-meng'] },
    },
    {
      email: 'member4@test.com',
      roles: ['member'],
      name_english: { first_name: 'Dan', last_name: 'Phichai', nickname: 'Dan' },
      name_thai: { first_name: 'แดน', last_name: 'พิชัย', nickname: 'แดน' },
      academic: { student_id: '6500022', year: tag['year-3'], track: tag['track-rak'] },
    },
    {
      email: 'member5@test.com',
      roles: ['member'],
      name_english: { first_name: 'Eve', last_name: 'Natcha', nickname: 'Eve' },
      name_thai: { first_name: 'อีฟ', last_name: 'ณัชชา', nickname: 'อีฟ' },
      academic: { student_id: '6500023', year: tag['year-5'], track: tag['track-md'] },
    },
    {
      email: 'member6@test.com',
      roles: ['member'],
      name_english: { first_name: 'Fon', last_name: 'Ratchada', nickname: 'Fon' },
      name_thai: { first_name: 'ฝน', last_name: 'รัชดา', nickname: 'ฝน' },
      academic: { student_id: '6500024', year: tag['year-6'], track: tag['track-md'] },
    },
    {
      email: 'member7@test.com',
      roles: ['member'],
      name_english: { first_name: 'Gun', last_name: 'Thanawat', nickname: 'Gun' },
      name_thai: { first_name: 'กัน', last_name: 'ธนวัฒน์', nickname: 'กัน' },
      academic: { student_id: '6500025', year: tag['year-gap'], track: tag['track-md-meng'] },
    },
  ]

  const users: Record<string, number> = {}
  for (const u of newUsers) {
    users[u.email] = await upsert(
      payload,
      'users',
      { email: { equals: u.email } },
      { ...u, password: seedPassword(), notification_preferences: { email_opt_in: true } },
      u.email,
    )
  }
  for (const email of [
    adminEmail,
    'admin@test.com',
    'staff.od@test.com',
    'member@test.com',
  ]) {
    users[email] = await idOf('users', { email: { equals: email } })
  }
  const superadmin = users[adminEmail]
  const admin = users['admin@test.com']
  const staff = users['staff.od@test.com']
  const member = users['member@test.com']

  // Fill out the two accounts most likely to be opened on /account so every
  // profile section (portfolio, socials, interests, contact, DOB) renders.
  console.log('\n🧑‍💼 Enriching profiles...')
  for (const [id, extras] of [
    [
      superadmin,
      {
        dob: '2003-04-12T00:00:00.000Z',
        contact: { line_id: 'demo.user', phone_number: '081-234-5678' },
        interests: [tag['type-workshop-full'], tag['type-conference'], tag['type-volunteer']],
        social_media: [
          { platform: 'Instagram', handle: '@demo.user' },
          { platform: 'LinkedIn', handle: 'https://linkedin.com/in/demo-user' },
        ],
        portfolio: [
          { year: '2024', activity: 'Basic Surgical Skills Workshop', role: 'Participant' },
          { year: '2025', activity: 'SurgSoc Annual Camp', role: 'Head of Operations' },
          { year: '2026', activity: 'Ramathibodi Surgical Society', role: 'President' },
        ],
      },
    ],
    [
      member,
      {
        dob: '2005-09-01T00:00:00.000Z',
        contact: { line_id: 'mem.test', phone_number: '089-000-1111' },
        interests: [tag['type-special-lecture'], tag['type-workshop-observe']],
        social_media: [{ platform: 'Facebook', handle: 'regular.member' }],
        portfolio: [{ year: '2026', activity: 'Anatomy Review Session', role: 'Participant' }],
      },
    ],
  ] as const) {
    if (!id) continue
    await payload.update({ collection: 'users', id, data: extras, overrideAccess: true })
    console.log(`   ✅ profile extras (user ${id})`)
  }

  // ── Forms ────────────────────────────────────────
  // Covers every vanilla + custom field block and every "form is closed" reason.
  console.log('\n📝 Forms...')

  const applicationForm = {
    title: 'Workshop Application Form',
    submitButtonLabel: 'Submit Application',
    confirmationType: 'message',
    confirmationMessage: rich('Application received. You will hear from us before the selection deadline.'),
    accept_responses: true,
    fields: [
      { blockType: 'message', message: rich('Tell us why you want to join. All fields marked * are required.') },
      { blockType: 'userProfile', name: 'applicant_name', label: 'Your Name', profileField: 'name_english.first_name', readOnly: true },
      { blockType: 'text', name: 'student_id', label: 'Student ID', required: true, width: 50 },
      { blockType: 'email', name: 'contact_email', label: 'Contact Email', required: true, width: 50 },
      { blockType: 'number', name: 'year_of_study', label: 'Year of Study', required: true, width: 50 },
      { blockType: 'date', name: 'available_from', label: 'Available From', width: 50 },
      {
        blockType: 'select',
        name: 'shirt_size',
        label: 'Shirt Size',
        required: true,
        options: [
          { label: 'S', value: 's' },
          { label: 'M', value: 'm' },
          { label: 'L', value: 'l' },
          { label: 'XL', value: 'xl' },
        ],
      },
      {
        blockType: 'radio',
        name: 'prior_experience',
        label: 'Have you attended a surgical workshop before?',
        required: true,
        options: [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
        ],
      },
      {
        blockType: 'textarea',
        name: 'experience_detail',
        label: 'Describe your previous experience',
        // Conditional logic: only shown when the radio above is "yes".
        conditional: { enabled: true, action: 'show', source_field: 'prior_experience', operator: 'equals', value: 'yes' },
      },
      { blockType: 'textarea', name: 'motivation', label: 'Why do you want to join?', required: true },
      { blockType: 'checkbox', name: 'agree_terms', label: 'I agree to the society code of conduct', required: true },
    ],
  }

  const loaForm = {
    title: 'Leave of Absence Request',
    submitButtonLabel: 'Submit LOA',
    confirmationType: 'message',
    confirmationMessage: rich('Your leave request has been recorded and your place has been released.'),
    accept_responses: true,
    fields: [
      { blockType: 'message', message: rich('Submitting this form releases your seat. This cannot be undone.') },
      {
        blockType: 'select',
        name: 'loa_reason',
        label: 'Reason',
        required: true,
        options: [
          { label: 'Academic conflict', value: 'academic' },
          { label: 'Illness', value: 'illness' },
          { label: 'Personal', value: 'personal' },
          { label: 'Other', value: 'other' },
        ],
      },
      {
        blockType: 'textarea',
        name: 'loa_detail',
        label: 'Please explain',
        required: true,
        conditional: { enabled: true, action: 'show', source_field: 'loa_reason', operator: 'equals', value: 'other' },
      },
    ],
  }

  const reflectionForm = {
    title: 'Post-Event Reflection',
    submitButtonLabel: 'Submit Reflection',
    confirmationType: 'message',
    confirmationMessage: rich('Thanks — your reflection has been recorded.'),
    accept_responses: true,
    fields: [
      { blockType: 'slider', name: 'overall_rating', label: 'Overall rating', variant: 'stars', min: 1, max: 5, required: true },
      { blockType: 'slider', name: 'difficulty', label: 'How difficult was it?', variant: 'slider', min: 1, max: 10 },
      {
        blockType: 'checkboxGroup',
        name: 'skills_gained',
        label: 'Which skills did you practise?',
        options: [
          { label: 'Suturing', value: 'suturing' },
          { label: 'Knot tying', value: 'knots' },
          { label: 'Instrument handling', value: 'instruments' },
          { label: 'Sterile technique', value: 'sterile' },
        ],
        minSelect: 1,
        maxSelect: 4,
      },
      {
        blockType: 'ranking',
        name: 'session_ranking',
        label: 'Rank the sessions',
        options: [
          { label: 'Opening lecture', value: 'lecture' },
          { label: 'Hands-on station', value: 'handson' },
          { label: 'Panel Q&A', value: 'panel' },
        ],
      },
      { blockType: 'textarea', name: 'takeaway', label: 'Biggest takeaway', required: true },
      { blockType: 'textarea', name: 'improvements', label: 'What should we improve?' },
    ],
  }

  const redirectForm = {
    title: 'Newsletter Signup (redirects)',
    submitButtonLabel: 'Sign up',
    confirmationType: 'redirect',
    redirect: { url: '/events' },
    accept_responses: true,
    fields: [
      { blockType: 'email', name: 'email', label: 'Email', required: true },
      { blockType: 'checkbox', name: 'weekly', label: 'Send me the weekly digest' },
    ],
  }

  const manuallyClosedForm = {
    title: 'Closed Form (manually closed)',
    confirmationType: 'message',
    confirmationMessage: rich('Thanks!'),
    accept_responses: false,
    closed_message: rich('This form has been closed by the organisers. Contact the OD team if you need to submit late.'),
    fields: [{ blockType: 'text', name: 'answer', label: 'Answer' }],
  }

  const expiredForm = {
    title: 'Closed Form (deadline passed)',
    confirmationType: 'message',
    confirmationMessage: rich('Thanks!'),
    accept_responses: true,
    response_deadline: at(-3),
    closed_message: rich('The deadline for this form passed three days ago.'),
    fields: [{ blockType: 'text', name: 'answer', label: 'Answer' }],
  }

  // Seeded open, filled, then capped — the beforeChange hook rejects submissions
  // once response_limit is reached, so the quota has to be set afterwards.
  const fullForm = {
    title: 'Closed Form (response limit reached)',
    confirmationType: 'message',
    confirmationMessage: rich('Thanks!'),
    accept_responses: true,
    closed_message: rich('This form reached its maximum number of responses.'),
    fields: [{ blockType: 'text', name: 'answer', label: 'Answer' }],
  }

  const formIds: Record<string, number> = {}
  for (const form of [
    applicationForm,
    loaForm,
    reflectionForm,
    redirectForm,
    manuallyClosedForm,
    expiredForm,
    fullForm,
  ]) {
    formIds[form.title] = await upsert(
      payload,
      'forms',
      { title: { equals: form.title } },
      form,
      form.title,
    )
  }
  formIds['Participant Feedback & Registration'] = await idOf('forms', {
    title: { equals: 'Participant Feedback & Registration' },
  })

  // ── Events ───────────────────────────────────────
  // One event per lifecycle state the UI branches on.
  console.log('\n🎉 Events (all lifecycle states)...')
  const events = [
    {
      name: 'Basic Surgical Skills Workshop',
      description:
        'Hands-on introduction to instrument handling, knot tying and simple interrupted sutures. Open to all pre-clinical years.',
      event_type: tag['type-workshop-full'],
      department: tag['dept-od'],
      date_begin: at(21, 9),
      date_end: at(21, 17),
      location: cnmiLab,
      participant_limit: 20,
      is_visible: true,
      registration_opens_at: at(-5),
      registration_closes_at: at(14),
      status_override: 'auto',
      subscription_form: formIds['Workshop Application Form'],
      loa_form: formIds['Leave of Absence Request'],
      reflection_form: formIds['Post-Event Reflection'],
      max_waiting_list: 10,
      custom_acceptance_email: 'Bring your own loupes if you have them. Lunch is provided.',
      participant_detail: rich(
        'LINE group: https://line.me/ti/g/surgsoc-bssw',
        'Meet at the CNMI lobby at 08:30. Wear scrubs and closed shoes.',
      ),
      image_url: '/assets/beta.jpg',
    },
    {
      name: 'Advanced Suturing Masterclass',
      description: 'Registration has not opened yet — opens in ten days.',
      event_type: tag['type-workshop-assistant'],
      department: tag['dept-ia'],
      date_begin: at(45, 13),
      date_end: at(45, 17),
      location: theatre4,
      participant_limit: 12,
      is_visible: true,
      registration_opens_at: at(10),
      registration_closes_at: at(40),
      status_override: 'auto',
      subscription_form: formIds['Workshop Application Form'],
    },
    {
      name: 'Neurosurgery Grand Rounds',
      description: 'Registration window has closed, event still upcoming.',
      event_type: tag['type-special-lecture'],
      department: tag['dept-ia'],
      date_begin: at(6, 16),
      date_end: at(6, 18),
      location: phayathai,
      participant_limit: 0,
      is_visible: true,
      registration_opens_at: at(-20),
      registration_closes_at: at(-2),
      status_override: 'auto',
    },
    {
      name: 'SurgSoc Annual Camp 2027',
      description: 'Three-day residential camp. Places are full — join the waiting list.',
      event_type: tag['type-event'],
      department: tag['dept-ia'],
      date_begin: at(60, 8),
      date_end: at(62, 18),
      location: cnmiLab,
      participant_limit: 3,
      is_visible: true,
      registration_opens_at: at(-10),
      registration_closes_at: at(30),
      status_override: 'auto',
      max_waiting_list: 5,
      subscription_form: formIds['Workshop Application Form'],
      loa_form: formIds['Leave of Absence Request'],
    },
    {
      name: 'Operating Theatre Observation Day',
      description: 'Happening right now — the event is in its live window.',
      event_type: tag['type-workshop-observe'],
      department: tag['dept-ea'],
      date_begin: at(0, -2),
      date_end: at(0, 4),
      location: theatre4,
      participant_limit: 8,
      is_visible: true,
      registration_opens_at: at(-30),
      registration_closes_at: at(-1),
      status_override: 'auto',
      participant_detail: rich('Report to the OR reception desk. Scrubs provided on site.'),
    },
    {
      name: 'Trauma Symposium 2026',
      description: 'Completed event with the reflection form open to participants.',
      event_type: tag['type-conference'],
      department: tag['dept-ia'],
      date_begin: at(-14, 9),
      date_end: at(-14, 17),
      location: phayathai,
      participant_limit: 50,
      is_visible: true,
      registration_opens_at: at(-60),
      registration_closes_at: at(-20),
      status_override: 'auto',
      reflection_form: formIds['Post-Event Reflection'],
      is_reflection_open: true,
    },
    {
      name: 'Unpublished Planning Event',
      description: 'is_visible = false. Should only be reachable by event managers.',
      event_type: tag['type-event'],
      department: tag['dept-od'],
      date_begin: at(90, 10),
      date_end: at(90, 16),
      is_visible: false,
      status_override: 'auto',
    },
    {
      name: 'Inspirational Talk: Life as a Surgeon',
      description: 'status_override = open. Registration is forced open regardless of dates.',
      event_type: tag['type-inspirational'],
      department: tag['dept-pr'],
      date_begin: at(30, 18),
      date_end: at(30, 20),
      location: onlineLoc,
      participant_limit: 0,
      is_visible: true,
      registration_opens_at: at(20), // deliberately in the future — the override wins
      registration_closes_at: at(25),
      status_override: 'open',
    },
    {
      name: 'Rural Surgery Volunteer Trip',
      description: 'status_override = closed. Registration is forced shut inside an open window.',
      event_type: tag['type-volunteer'],
      department: tag['dept-ea'],
      date_begin: at(50, 6),
      date_end: at(53, 20),
      location: cnmiLab,
      participant_limit: 15,
      is_visible: true,
      registration_opens_at: at(-5),
      registration_closes_at: at(40),
      status_override: 'closed',
    },
    {
      name: 'International Exchange Info Session',
      description: 'Force-closed via the is_registration_closed checkbox rather than the override.',
      event_type: tag['type-exchange'],
      department: tag['dept-ea'],
      date_begin: at(12, 17),
      date_end: at(12, 19),
      location: onlineLoc,
      is_visible: true,
      is_registration_closed: true,
      status_override: 'auto',
    },
  ]

  const eventIds: Record<string, number> = {}
  for (const ev of events) {
    eventIds[ev.name] = await upsert(
      payload,
      'events',
      { name: { equals: ev.name } },
      { ...ev, owner: admin ?? superadmin, coordinator: staff ?? admin, groups: [] },
      ev.name,
    )
  }

  // ── Registrations ────────────────────────────────
  // Every status in the enum, spread so the logged-in superadmin sees a
  // different CTA on each event and staff see a populated applicants table.
  console.log('\n🎟️  Registrations (every status)...')
  const workshop = eventIds['Basic Surgical Skills Workshop']
  const camp = eventIds['SurgSoc Annual Camp 2027']
  const symposium = eventIds['Trauma Symposium 2026']
  const orDay = eventIds['Operating Theatre Observation Day']

  const registrations = [
    // Workshop — the applicants table, one row per decision state.
    { event: workshop, user: superadmin, status: 'accepted', selected_by: staff, selected_at: at(-1) },
    { event: workshop, user: member, status: 'confirmed', selected_by: staff, selected_at: at(-2) },
    { event: workshop, user: users['member2@test.com'], status: 'applicant' },
    { event: workshop, user: users['member3@test.com'], status: 'applicant' },
    {
      event: workshop,
      user: users['member4@test.com'],
      status: 'rejected',
      selected_by: staff,
      selected_at: at(-1),
      rejection_reason: 'Places were allocated to students who have not yet attended a skills workshop.',
    },
    { event: workshop, user: users['member5@test.com'], status: 'declined' },
    { event: workshop, user: users['member6@test.com'], status: 'withdrawn' },

    // Camp — full, so the rest sit on the waiting list ('subscribed').
    { event: camp, user: users['member2@test.com'], status: 'confirmed', selected_by: admin, selected_at: at(-6) },
    { event: camp, user: users['member3@test.com'], status: 'confirmed', selected_by: admin, selected_at: at(-6) },
    { event: camp, user: users['member4@test.com'], status: 'confirmed', selected_by: admin, selected_at: at(-6) },
    { event: camp, user: superadmin, status: 'subscribed' },
    { event: camp, user: users['member5@test.com'], status: 'subscribed' },
    { event: camp, user: users['member7@test.com'], status: 'subscribed' },

    // Past symposium — 'participant' fires the hook that assigns the reflection form.
    { event: symposium, user: superadmin, status: 'participant' },
    { event: symposium, user: member, status: 'participant' },
    { event: symposium, user: users['member2@test.com'], status: 'participant' },
    { event: symposium, user: users['member3@test.com'], status: 'participant' },

    // Live event.
    { event: orDay, user: users['member6@test.com'], status: 'confirmed', selected_by: staff, selected_at: at(-3) },
    { event: orDay, user: users['member7@test.com'], status: 'accepted', selected_by: staff, selected_at: at(-3) },
  ]

  // `submission` on a registration is a relationship to a real form-submissions
  // doc, not an inline blob — only the workshop actually collects an
  // application form, so that's the only event these fixtures attach one to.
  const applicationAnswers = {
    student_id: '650XXXX',
    shirt_size: 'm',
    prior_experience: 'no',
    motivation: 'Seeded application answer — shown in the applicants detail view.',
    agree_terms: true,
  }

  for (const reg of registrations) {
    if (!reg.event || !reg.user) continue
    const submission =
      reg.event === workshop && formIds['Workshop Application Form']
        ? await upsert(
            payload,
            'form-submissions',
            {
              and: [
                { form: { equals: formIds['Workshop Application Form'] } },
                { user: { equals: reg.user } },
              ],
            },
            {
              form: formIds['Workshop Application Form'],
              user: reg.user,
              submissionData: Object.entries(applicationAnswers).map(([field, value]) => ({
                field,
                value: String(value),
              })),
            },
            `application answer / user ${reg.user}`,
          )
        : undefined
    await upsert(
      payload,
      'registrations',
      { and: [{ event: { equals: reg.event } }, { user: { equals: reg.user } }] },
      { ...reg, submission },
      `event ${reg.event} / user ${reg.user} → ${reg.status}`,
    )
  }

  // ── Form submissions ─────────────────────────────
  console.log('\n📨 Form Submissions...')
  const submit = async (formId: number, userId: number, data: Record<string, unknown>) => {
    if (!formId || !userId) return
    const existing = await payload.find({
      collection: 'form-submissions',
      where: { and: [{ form: { equals: formId } }, { user: { equals: userId } }] },
      limit: 1,
      overrideAccess: true,
      depth: 0,
    })
    if (existing.totalDocs > 0) {
      console.log(`   ℹ️  submission form ${formId} / user ${userId} (exists)`)
      return
    }
    await payload.create({
      collection: 'form-submissions',
      data: {
        form: formId,
        user: userId,
        submissionData: Object.entries(data).map(([field, value]) => ({ field, value: String(value) })),
      },
      overrideAccess: true,
    })
    console.log(`   ✅ submission form ${formId} / user ${userId}`)
  }

  await submit(formIds['Post-Event Reflection'], member, {
    overall_rating: 5,
    difficulty: 7,
    skills_gained: 'suturing,knots',
    session_ranking: 'handson,lecture,panel',
    takeaway: 'The hands-on station was worth the whole day.',
    improvements: 'More instructors per station.',
  })
  await submit(formIds['Participant Feedback & Registration'], users['member2@test.com'], {
    satisfaction: 4,
    topics_interest: 'suturing,anatomy',
    event_ranking: 'morning,afternoon,evening',
  })
  await submit(formIds['Workshop Application Form'], users['member3@test.com'], {
    student_id: '6500021',
    contact_email: 'member3@test.com',
    year_of_study: 2,
    shirt_size: 'm',
    prior_experience: 'no',
    motivation: 'I want to build confidence before my surgical rotation.',
    agree_terms: true,
  })
  // Fill, then cap — the quota check runs on create, so the limit goes on last.
  await submit(formIds['Closed Form (response limit reached)'], users['member4@test.com'], {
    answer: 'The one and only accepted response.',
  })
  await payload.update({
    collection: 'forms',
    id: formIds['Closed Form (response limit reached)'],
    data: { response_limit: 1 },
    overrideAccess: true,
  })
  console.log('   ✅ response limit capped at 1')

  // ── Form assignments ─────────────────────────────
  // The reflection assignments were created by the registration hook; these add
  // the deadline / blocking / completed variants.
  console.log('\n📌 Form Assignments...')
  const assignments = [
    {
      form: formIds['Participant Feedback & Registration'],
      user: superadmin,
      deadline: at(7),
      completed: false,
      blocks_registration: false,
    },
    {
      // Blocks event registration until completed. Deliberately NOT on the main
      // superadmin account, so the registration flow stays testable there.
      form: formIds['Workshop Application Form'],
      user: users['member2@test.com'],
      deadline: at(3),
      completed: false,
      blocks_registration: true,
    },
    {
      form: formIds['Closed Form (deadline passed)'],
      user: users['member5@test.com'],
      deadline: at(-3),
      completed: false,
      blocks_registration: false,
    },
    {
      form: formIds['Post-Event Reflection'],
      user: member,
      deadline: at(-1),
      completed: true,
      blocks_registration: false,
    },
  ]
  for (const a of assignments) {
    if (!a.form || !a.user) continue
    await upsert(
      payload,
      'form-assignments',
      { and: [{ form: { equals: a.form } }, { user: { equals: a.user } }] },
      { ...a, assigned_by: admin ?? superadmin },
      `form ${a.form} → user ${a.user}${a.blocks_registration ? ' (blocking)' : ''}`,
    )
  }

  // ── Feature requests ─────────────────────────────
  console.log('\n🐞 Feature Requests / Bug Reports...')
  const featureRequests = [
    {
      type: 'bug',
      title: 'Event card shows the wrong timezone',
      description: 'The workshop on the events list shows 02:00 while the detail page shows 09:00 for the same event.',
      status: 'open',
      submitted_by: member,
    },
    {
      type: 'feature',
      title: 'Add a calendar export for confirmed events',
      description: 'An .ics download on the event detail page once my registration is confirmed.',
      status: 'planned',
      submitted_by: users['member2@test.com'],
    },
    {
      type: 'feature',
      title: 'Show remaining places on the event card',
      description: 'Right now I only find out an event is full after I open the apply page.',
      status: 'in_progress',
      submitted_by: users['member3@test.com'],
      admin_notes: 'Needs a registration count aggregate on the list query — watch out for N+1.',
    },
    {
      type: 'bug',
      title: 'Thai name renders as boxes on the account page',
      description: 'Font fallback issue on Windows Chrome.',
      status: 'done',
      submitted_by: users['member4@test.com'],
      admin_notes: 'Fixed by adding Noto Sans Thai to the font stack.',
    },
    {
      type: 'feature',
      title: 'Dark mode',
      description: 'Please.',
      status: 'closed',
      submitted_by: users['member5@test.com'],
      admin_notes: 'Out of scope for this academic year.',
    },
  ]
  for (const fr of featureRequests) {
    if (!fr.submitted_by) continue
    await upsert(payload, 'feature-requests', { title: { equals: fr.title } }, fr, fr.title)
  }

  // ── Globals ──────────────────────────────────────
  console.log('\n🌐 Globals...')
  /*
    Sample data on. Every record this script writes is flagged `is_sample`
    (see SAMPLE_FLAGGED above), and `showSampleData` defaults to false — so
    without this the dev seed runs, reports success, and the site shows an
    empty roster. The flag is what makes the fixtures visible; seeding them
    and leaving it off is seeding nothing.

    Deliberately here and not in `seed-db.ts`: that one seeds real content for
    any environment, and this switch must stay off outside a demo.
  */
  await payload.updateGlobal({
    slug: 'site-settings',
    data: { enableI18n: true, showSampleData: true },
    overrideAccess: true,
  })
  console.log('   ✅ Site Settings (i18n on, sample data visible)')

  await payload.updateGlobal({
    slug: 'home-content',
    data: {
      sections: [
        {
          kicker: 'About The Society',
          heading: 'Where Passion, Determination, and Teamwork Forge the Future',
          body: 'Ramathibodi Surgical Society is a student-driven community dedicated to growth in surgical knowledge, collaboration, and service.',
          imageUrl: '/assets/beta.jpg',
        },
        {
          kicker: 'What We Do',
          heading: 'Workshops, Lectures, and Theatre Time',
          body: 'From knot-tying drills to observing live operations, our calendar runs the full year with events for every pre-clinical and clinical year.',
          imageUrl: '/assets/beta.jpg',
        },
        {
          kicker: 'Join Us',
          heading: 'Open to Every Ramathibodi Student',
          body: 'Sign in with your Mahidol account, complete your profile, and you can apply to any open event on the calendar.',
        },
      ],
    },
    overrideAccess: true,
  })
  console.log('   ✅ Home Content (3 sections)')

  console.log('\n────────────────────────────────────────')
  console.log('✅ Dev fixtures complete.\n')
  console.log('📋 Accounts (Google OAuth in dev):')
  console.log(`   • ${adminEmail} — superadmin, accepted on 1 event, waitlisted, 1 reflection due`)
  console.log('   • admin@test.com / staff.od@test.com — event managers')
  console.log('   • member@test.com — confirmed participant with a full profile')
  console.log('   • member2@test.com — has a BLOCKING form assignment')
  console.log('   • visitor@test.com — incomplete profile (tests the profile gate)')
  console.log('\n🎯 Coverage: every registration status, every event phase, every form-closed reason.')
}

const isMainScript = process.argv[1]?.includes('seed-dev')
if (isMainScript) {
  seedDevData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Unhandled error:', err)
      process.exit(1)
    })
}
