#!/usr/bin/env node
// @ts-nocheck — payload-types.ts may be stale; regenerate via `pnpm run generate:types`

/**
 * Database Seed Script
 * Seeds the database with test data using PayloadCMS Local API.
 * Fully idempotent — safe to run multiple times.
 *
 * Usage: pnpm run db:seed
 */

import { getPayloadInstance, seedAdminEmail, seedPassword } from './shared.js'
import { seedDevData } from './seed-dev.js'
import { seedTags, upsertTag, tagIdsBySlug } from './seed-tags.js'
import type { Payload } from 'payload'

/**
 * Seeds the fixed set of system/role/department groups, linking each to the
 * tag of the same slug (see the loop below for why). Idempotent — upserts on
 * slug, same as seedTags. Requires the department tags to already exist.
 *
 * Usage: pnpm run db:seed:groups
 */
export async function seedGroups(payloadInstance?: Payload) {
  const payload = payloadInstance || (await getPayloadInstance())
  const tag = await tagIdsBySlug(payload)

  console.log('\n📁 Seeding Groups...')
  const groups = [
    { name: 'Admin', slug: 'admin', type: 'system' as const, permissions: { manage_users: true, manage_content: true, manage_events: true, manage_forms: true } },
    { name: 'Superadmin', slug: 'superadmin', type: 'system' as const, permissions: { manage_users: true, manage_content: true, manage_events: true, manage_forms: true } },
    { name: 'Staff', slug: 'staff', type: 'role' as const, permissions: { manage_events: true, manage_forms: true } },
    { name: 'Member', slug: 'member', type: 'system' as const, permissions: {} },
    { name: 'Visitor', slug: 'visitor', type: 'system' as const, permissions: {} },
    // Department Groups — one per department tag, same slug. Four of them;
    // the old Academic and Creative & Content rows are retired in seed-tags.
    { name: 'Internal Affairs', slug: 'dept-ia', type: 'department' as const, permissions: { manage_events: true, manage_forms: true } },
    { name: 'External Affairs', slug: 'dept-ea', type: 'department' as const, permissions: { manage_events: true, manage_forms: true } },
    { name: 'Organizational Development', slug: 'dept-od', type: 'department' as const, permissions: { manage_events: true, manage_forms: true } },
    { name: 'Public Relations', slug: 'dept-pr', type: 'department' as const, permissions: { manage_events: true, manage_forms: true } },
    // No year or track groups. Those are tags on the user; a group would only
    // restate them, and it granted no permissions. See sync-user-groups.ts.
  ]

  for (const group of groups) {
    /*
      Department, year and track groups carry the tag of the same slug. That
      link is what `syncUserGroups` follows — a user holds a tag, and whichever
      group points at it becomes their membership. System and role groups get
      no tag: they are security identities, not taxonomy.
    */
    const linkedTag = tag[group.slug] ?? null

    const existing = await payload.find({
      collection: 'groups',
      where: { slug: { equals: group.slug } },
      limit: 1,
    })

    if (existing.totalDocs > 0) {
      // An existing group still needs the link, so this updates rather than
      // skipping — a re-seed after the tags migration is how it gets one.
      if (linkedTag && !existing.docs[0].tag) {
        await payload.update({
          collection: 'groups',
          id: existing.docs[0].id,
          data: { tag: linkedTag },
          overrideAccess: true,
        })
        console.log(`   🔗 ${group.name} → ${group.slug}`)
      } else {
        console.log(`   ℹ️  ${group.name} (exists)`)
      }
    } else {
      await payload.create({
        collection: 'groups',
        data: { ...group, tag: linkedTag },
        overrideAccess: true,
      })
      console.log(`   ✅ ${group.name}`)
    }
  }
}

export async function seedDatabase(payloadInstance?: Payload) {
  // Fail before any writes, not mid-seed with half the data already inserted.
  const adminEmail = seedAdminEmail()

  console.log('🌱 Seeding database...\n')
  console.log('────────────────────────────────────────')

  const payload = payloadInstance || await getPayloadInstance()

  // Tags first — groups link to them, and users, events and attendings all
  // hold them. Nothing below can resolve until the vocabulary exists.
  await seedTags(payload)

  // Slug → id, so every row below reads as a slug instead of a magic number.
  const tag = await tagIdsBySlug(payload)

  await seedGroups(payload)

  // ── Users ────────────────────────────────────────
  console.log('\n👤 Seeding Users...')
  /*
    Only the @test.com rows carry `is_sample`. The first account is a real
    person, and flagging it would drop the only genuine member out of the home
    page count — the exact number the flag exists to keep honest.
  */
  const users = [
    {
      email: adminEmail,
      roles: ['superadmin'] as ('superadmin')[],
      // Placeholder, not a real person: the superadmin's email comes from
      // SEED_ADMIN_EMAIL, so whoever owns that address renames themselves on
      // first sign-in. Nothing reads this name back, unlike the email.
      name_english: { first_name: 'Site', last_name: 'Administrator', nickname: 'Admin' },
      name_thai: { first_name: 'ผู้ดูแล', last_name: 'ระบบ', nickname: 'แอดมิน' },
      academic: { student_id: '6500001', year: tag['year-4'], track: tag['track-md'] },
    },
    {
      email: 'admin@test.com',
      roles: ['admin'] as ('admin')[],
      name_english: { first_name: 'Admin', last_name: 'User', nickname: 'Admin' },
      name_thai: { first_name: 'แอดมิน', last_name: 'ผู้ใช้', nickname: 'แอด' },
      academic: { student_id: '6500002', year: tag['year-3'], track: tag['track-md-meng'] },
      is_sample: true,
    },
    {
      email: 'staff.od@test.com',
      roles: ['staff'] as ('staff')[],
      department: tag['dept-od'],
      name_english: { first_name: 'Staff', last_name: 'OD', nickname: 'OD' },
      name_thai: { first_name: 'สตาฟ', last_name: 'โอดี', nickname: 'โอ' },
      academic: { student_id: '6500003', year: tag['year-2'], track: tag['track-md'] },
      is_sample: true,
    },
    {
      email: 'member@test.com',
      roles: ['member'] as ('member')[],
      name_english: { first_name: 'Regular', last_name: 'Member', nickname: 'Mem' },
      name_thai: { first_name: 'สมาชิก', last_name: 'ทั่วไป', nickname: 'ซิก' },
      academic: { student_id: '6500005', year: tag['year-1'], track: tag['track-md'] },
      is_sample: true,
    },
  ]

  const createdUsers: Record<string, number> = {}
  for (const user of users) {
    const existing = await payload.find({
      collection: 'users',
      where: { email: { equals: user.email } },
      limit: 1,
    })

    if (existing.totalDocs > 0) {
      createdUsers[user.email] = existing.docs[0].id
      console.log(`   ℹ️  ${user.email} (exists)`)
    } else {
      const doc = await payload.create({
        collection: 'users',
        data: {
          email: user.email,
          password: seedPassword(), // Required by Payload auth; users login via Google OAuth
          roles: user.roles,
          department: user.department,
          name_english: user.name_english,
          name_thai: user.name_thai,
          academic: user.academic,
          is_sample: user.is_sample === true,
          notification_preferences: { email_opt_in: true },
        },
        overrideAccess: true,
      })
      createdUsers[user.email] = doc.id
      console.log(`   ✅ ${user.email}`)
    }
  }

  // ── Events ────────────────────────────────────────
  console.log('\n🎉 Seeding Events...')
  const adminId = createdUsers[adminEmail] || createdUsers['admin@test.com']
  const staffId = createdUsers['staff.od@test.com']
  const teachingBuilding = tag['loc-pyt-learning']
  const onlineVenueId = tag['loc-online']

  const events = [
    {
      name: 'Surgical Skills Workshop 2026',
      description: 'Learn essential surgical skills including suturing, knot-tying, and basic procedures.',
      owner: adminId,
      coordinator: staffId,
      date_begin: '2026-03-15T09:00:00Z',
      date_end: '2026-03-15T17:00:00Z',
      location: teachingBuilding,
      event_type: tag['type-workshop-full'],
      department: tag['dept-od'],
      participant_limit: 30,
      is_visible: true,
      registration_opens_at: '2026-02-01T00:00:00Z',
      registration_closes_at: '2026-03-10T23:59:59Z',
      status_override: 'auto' as const,
      is_sample: true,
    },
    {
      name: 'Anatomy Review Session',
      description: 'Comprehensive anatomy review for upcoming exams. Focus on upper and lower limb.',
      owner: adminId,
      coordinator: staffId,
      date_begin: '2026-04-01T13:00:00Z',
      date_end: '2026-04-01T16:00:00Z',
      location: onlineVenueId,
      event_type: tag['type-special-lecture'],
      department: tag['dept-ia'],
      participant_limit: 100,
      is_visible: true,
      registration_opens_at: '2026-03-01T00:00:00Z',
      registration_closes_at: '2026-03-28T23:59:59Z',
      status_override: 'auto' as const,
      is_sample: true,
    },
    {
      name: 'SurgSoc Annual Camp',
      description: 'Join us for our annual camp! Team building, workshops, and fun activities.',
      owner: adminId,
      coordinator: staffId,
      date_begin: '2026-05-10T08:00:00Z',
      date_end: '2026-05-12T18:00:00Z',
      event_type: tag['type-event'],
      department: tag['dept-od'],
      participant_limit: 50,
      is_visible: true,
      registration_opens_at: '2026-04-01T00:00:00Z',
      registration_closes_at: '2026-05-01T23:59:59Z',
      max_waiting_list: 10,
      status_override: 'auto' as const,
      is_sample: true,
    },
  ]

  for (const event of events) {
    const existing = await payload.find({
      collection: 'events',
      where: {
        and: [
          { name: { equals: event.name } },
          { date_begin: { equals: event.date_begin } },
        ],
      },
      limit: 1,
    })

    if (existing.totalDocs > 0) {
      console.log(`   ℹ️  ${event.name} (exists)`)
    } else {
      await payload.create({
        collection: 'events',
        data: event,
        overrideAccess: true,
      })
      console.log(`   ✅ ${event.name}`)
    }
  }

  // ── Attendings ─────────────────────────────────────
  /*
    The Department of Surgery's faculty, as [specialty, title, Thai first,
    Thai last, English first, English last].

    Thai spellings and the official English transliterations come from the
    department's own per-division faculty pages and the CNMI school listing —
    not transliterated here. Where the two disagreed with the list we were
    given, the department's spelling wins: it is the one printed on their
    letterhead. That resolved "รุ่งวรโศกิต" to "รุ่งวรโศภิต" and gave ranks for
    the entries listed without one.

    Two names had no published English spelling and are transliterated:
    Janisada Sakulsampaopol and Warut Saisopa. Worth an editor's eye.

    Real people, so no `is_sample` — they belong in the advisor count.
  */
  console.log('\n🩺 Seeding Attendings...')
  const attendings = [
    ['spec-gi-general', 'title-assoc-prof-m', 'วีรพัฒน์', 'สุวรรณธรรมา', 'Weerapat', 'Suwanthanma'],
    ['spec-gi-general', 'title-asst-prof-m', 'จักรพันธ์', 'จิรสิริธรรม', 'Jakrapan', 'Jirasiritham'],
    ['spec-gi-general', 'title-asst-prof-m', 'ฐัชกร', 'พรหมบุญ', 'Tatchakorn', 'Promboon'],
    ['spec-gi-general', 'title-lecturer-f', 'พิมพ์ชนก', 'รุ่งวรโศภิต', 'Pimchanok', 'Roongwarasopit'],
    ['spec-gi-general', 'title-lecturer-m', 'ภัทรพล', 'โชติสันต์', 'Pattarapon', 'Chotisun'],

    ['spec-hpb', 'title-asst-prof-m', 'ปรมินทร์', 'ม่วงแก้ว', 'Paramin', 'Muangkaew'],
    ['spec-hpb', 'title-asst-prof-m', 'พงศธร', 'ตั้งทวี', 'Pongsatorn', 'Tungtawee'],
    ['spec-hpb', 'title-lecturer-f', 'วรินทร์ทิพย์', 'ธงชัย', 'Varinthip', 'Thongchai'],
    ['spec-hpb', 'title-lecturer-f', 'วธู', 'วาสนสิริ ฟาร์เกอร์สัน', 'Watoo', 'Vassanasiri Farquharson'],

    ['spec-breast-endocrine', 'title-assoc-prof-m', 'ภาณุวัฒน์', 'เลิศสิทธิชัย', 'Panuwat', 'Lertsitthichai'],
    ['spec-breast-endocrine', 'title-lecturer-f', 'ลักขณา', 'อดิเรกลาภวงศ์', 'Lakkana', 'Adireklarpwong'],

    ['spec-vascular-transplant', 'title-asst-prof-m', 'เชาวนันท์', 'พรวรากรณ์', 'Chaowanun', 'Pornwaragorn'],
    ['spec-vascular-transplant', 'title-asst-prof-f', 'กรวีร์', 'เทพสัมฤทธิ์พร', 'Gorawee', 'Tepsamrithporn'],
    ['spec-vascular-transplant', 'title-assoc-prof-f', 'ปิยนุช', 'พูตระกูล', 'Piyanut', 'Pootracool'],
    ['spec-vascular-transplant', 'title-asst-prof-m', 'สุทัศน์', 'ฮ้อศิริมานนท์', 'Suthas', 'Horsirimanont'],
    ['spec-vascular-transplant', 'title-lecturer-f', 'กนกลดา', 'ศรีเกื้อ', 'Kanoklada', 'Srikuea'],
    ['spec-vascular-transplant', 'title-asst-prof-f', 'ณัฐสิริ', 'กิตติถิระพงษ์', 'Nutsiri', 'Kittitirapong'],
    ['spec-vascular-transplant', 'title-lecturer-m', 'กรกช', 'เกษประเสริฐ', 'Goragoch', 'Gesprasert'],
    ['spec-vascular-transplant', 'title-lecturer-m', 'ณัฐพัชร์', 'เขมวรพงศ์', 'Nattapat', 'Khemworapong'],
    ['spec-vascular-transplant', 'title-lecturer-m', 'บัณฑิต', 'สกุลชัยรุ่งเรือง', 'Bundit', 'Sakulchairungrueng'],

    ['spec-trauma-critical-care', 'title-assoc-prof-f', 'ชลลดา', 'ครุฑศรี', 'Chonlada', 'Krutsri'],
    ['spec-trauma-critical-care', 'title-asst-prof-f', 'วิสารัช', 'ผลิตนนท์เกียรติ', 'Visarat', 'Palitnonkiat'],
    ['spec-trauma-critical-care', 'title-lecturer-f', 'อิสรวดี', 'จงกิตติรักษ์', 'Israwadee', 'Chongkittiruk'],

    ['spec-plastic', 'title-assoc-prof-m', 'เฉลิมพงษ์', 'ฉัตรดอกไม้ไพร', 'Chalermpong', 'Chatdokmaiprai'],
    ['spec-plastic', 'title-lecturer-m', 'สรายุทธ', 'ดำรงวงศ์ศิริ', 'Sarayuth', 'Dumrongwongsiri'],
    ['spec-plastic', 'title-assoc-prof-m', 'กิดากร', 'กิระนันทวัฒน์', 'Kidakorn', 'Kiranantawat'],
    ['spec-plastic', 'title-lecturer-m', 'วสันต์', 'เจนธนากุล', 'Wasan', 'Janetanakul'],

    ['spec-neurosurgery', 'title-assoc-prof-m', 'อัตถพร', 'บุญเกิด', 'Atthaporn', 'Boongird'],
    ['spec-neurosurgery', 'title-assoc-prof-m', 'สรยุทธ', 'ชำนาญเวช', 'Sorayouth', 'Chumnanvej'],
    ['spec-neurosurgery', 'title-lecturer-f', 'จณิสดา', 'สกุลสำเภาพล', 'Janisada', 'Sakulsampaopol'],
    ['spec-neurosurgery', 'title-asst-prof-m', 'วสวัตติ์', 'มุนินทร', 'Wasawat', 'Muninthorn'],

    ['spec-urology', 'title-lecturer-m', 'ทรงยศ', 'แตงมีแสง', 'Songyos', 'Tangmesang'],
    ['spec-urology', 'title-assoc-prof-f', 'ปกเกศ', 'ศิริศรีตรีรัตน์', 'Pokket', 'Sirisreetreerux'],

    ['spec-pediatric', 'title-lecturer-m', 'ชวินธีร์', 'พุทธธนะพิทักษ์', 'Chawintee', 'Puttanapitak'],
    ['spec-pediatric', 'title-lecturer-f', 'อำไพพรรณ', 'บุญไทย', 'Ampaipan', 'Boonthai'],
    ['spec-pediatric', 'title-lecturer-f', 'ศนิ', 'มลกุล', 'Sani', 'Molagool'],

    ['spec-cardiothoracic', 'title-lecturer-m', 'ปิยะ', 'เชิญถนอมวงศ์', 'Piya', 'Cherntanomwong'],
    ['spec-cardiothoracic', 'title-lecturer-m', 'วรุตม์', 'สายโสภา', 'Warut', 'Saisopa'],
    ['spec-cardiothoracic', 'title-lecturer-m', 'ปิติพงษ์', 'สิทธิอำนวย', 'Pitipong', 'Sithiamnuai'],
    ['spec-cardiothoracic', 'title-lecturer-m', 'กิตติพศ', 'พีระพัฒนะพงษ์', 'Kittipos', 'Peerapatanapong'],
  ]

  for (const [index, row] of attendings.entries()) {
    const [specialty, title, thaiFirst, thaiLast, engFirst, engLast] = row

    const existing = await payload.find({
      collection: 'attendings',
      where: {
        and: [
          { 'name_english.first_name': { equals: engFirst } },
          { 'name_english.last_name': { equals: engLast } },
        ],
      },
      limit: 1,
    })

    if (existing.totalDocs > 0) {
      console.log(`   ℹ️  ${engFirst} ${engLast} (exists)`)
      continue
    }

    await payload.create({
      collection: 'attendings',
      data: {
        name_thai: { first_name: thaiFirst, last_name: thaiLast },
        name_english: { first_name: engFirst, last_name: engLast },
        title: tag[title],
        specialty: tag[specialty],
        is_visible: true,
        // Listed in the order above, which is the department's own — within a
        // specialty that runs senior-first.
        sort_order: index,
      },
      overrideAccess: true,
    })
    console.log(`   ✅ ${engFirst} ${engLast}`)
  }

  // ── Team Members ──────────────────────────────────
  console.log('\n👥 Seeding Team Members...')
  /*
    The society was established in 2023, so the roster runs over three academic
    years. Only the president is filled in — the rest of each committee is a
    real-name question the admin panel answers, and inventing placeholders here
    would put fictional people on a public page.

    sort_order 0 keeps each one in the leadership band; buildYearRoster treats
    anything under 3 as leadership.
  */
  const teamMembers = [
    { email: adminEmail, position: 'President', academic_year: '2025-2026', sort_order: 0, is_current: true },
    { email: 'admin@test.com', position: 'President', academic_year: '2024-2025', sort_order: 0, is_current: false },
    { email: 'staff.od@test.com', position: 'President', academic_year: '2023-2024', sort_order: 0, is_current: false },
  ]

  for (const tm of teamMembers) {
    const userId = createdUsers[tm.email]
    if (!userId) {
      console.log(`   ⚠️  ${tm.email} not found`)
      continue
    }

    const existing = await payload.find({
      collection: 'team-members',
      where: {
        and: [
          { user: { equals: userId } },
          { academic_year: { equals: tm.academic_year } },
        ],
      },
      limit: 1,
    })

    if (existing.totalDocs > 0) {
      console.log(`   ℹ️  ${tm.position} (exists)`)
    } else {
      await payload.create({
        collection: 'team-members',
        data: {
          user: userId,
          position: tm.position,
          academic_year: tm.academic_year,
          is_current: tm.is_current,
          sort_order: tm.sort_order,
        },
        overrideAccess: true,
      })
      console.log(`   ✅ ${tm.position}`)
    }
  }

  // ── Home & Terms Globals ────────────────────────
  console.log('\n📄 Seeding Home/Terms Content Globals...')

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
      ],
    },
    overrideAccess: true,
  })
  console.log('   ✅ Home Content global')

  await payload.updateGlobal({
    slug: 'terms-content',
    data: {
      intro: 'This page unifies terms of use and privacy commitments. Continued use of the platform means you agree to these policies.',
      sections: [
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
      ],
    },
    overrideAccess: true,
  })
  console.log('   ✅ Terms Content global')

  // ── Forms ──────────────────────────────────────────
  console.log('\n📝 Seeding Forms...')
  const sampleForm = {
    title: 'Participant Feedback & Registration',
    confirmationType: 'message',
    confirmationMessage: {
      root: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            version: 1,
            children: [{ type: 'text', version: 1, text: 'Thank you for your submission!' }],
            direction: 'ltr',
            format: '',
            indent: 0,
          }
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
      }
    },
    publish: {
      status: 'auto',
      allow_edits: true,
      allow_multiple_submissions: false,
    },
    fields: [
      {
        name: 'user_profile',
        label: 'User Profile Prefill',
        blockType: 'userProfile',
        profileField: 'name_english.first_name',
        readOnly: true,
      },
        {
        name: 'satisfaction',
        label: 'Overall Satisfaction',
        blockType: 'slider',
        variant: 'stars',
        min: 1,
        max: 5,
        required: true,
      },
      {
        name: 'topics_interest',
        label: 'Topics of Interest',
        blockType: 'checkboxGroup',
        options: [
          { label: 'Suturing', value: 'suturing' },
          { label: 'Knots', value: 'knots' },
          { label: 'Anatomy', value: 'anatomy' },
        ],
        minSelect: 1,
        maxSelect: 2,
      },
      {
        name: 'event_ranking',
        label: 'Rank these events by preference',
        blockType: 'ranking',
        options: [
          { label: 'Morning Session', value: 'morning' },
          { label: 'Afternoon Workshop', value: 'afternoon' },
          { label: 'Evening Networking', value: 'evening' },
        ],
      },
      {
        name: 'additional_comments',
        label: 'Additional Comments',
        blockType: 'textarea',
        conditional: {
            enabled: true,
            action: 'show',
            source_field: 'satisfaction',
            operator: 'less_than',
            value: 3
        }
      }
    ],
  } as any

  const existingForm = await payload.find({
      collection: 'forms',
      where: { title: { equals: sampleForm.title } },
      limit: 1,
  })

  if (existingForm.totalDocs > 0) {
      console.log(`   ℹ️  ${sampleForm.title} (exists)`)
  } else {
      await payload.create({
          collection: 'forms',
          data: sampleForm,
          overrideAccess: true,
      })
      console.log(`   ✅ ${sampleForm.title}`)
  }

  console.log('\n────────────────────────────────────────')
  console.log('\n✅ Database seeding complete!')
  console.log('\n📋 Test Users (use Google OAuth):')
  console.log(`   • ${adminEmail} (superadmin)`)
  console.log('   • admin@test.com (admin)')
  console.log('   • staff.od@test.com (staff)')
  console.log('   • member@test.com (member)')
  // Full-coverage dev fixtures (every status, phase and form state).
  await seedDevData(payload)

  console.log('\n🚀 Start the dev server: pnpm run dev')
}

// Run directly if this is the main script
const isMainScript = process.argv[1]?.includes('seed-db')
if (isMainScript) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Unhandled error:', err)
      process.exit(1)
    })
}
