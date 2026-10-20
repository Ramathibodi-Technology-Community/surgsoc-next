import assert from 'node:assert/strict'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { applyToEvent } from '../src/libs/event-application'

// Synthetic, disposable preview only. Never seed real accounts or send mail.
const url = new URL(process.env.DATABASE_URL || '')
assert.equal(url.hostname, '127.0.0.1')
assert.equal(url.pathname, '/surgsoc_events_test')
assert(!process.env.RESEND_API_KEY)
const payload = await getPayload({ config })
const existing = await payload.find({ collection: 'events', where: { name: { equals: 'Local demo: Surgical Skills Weekend' } }, depth: 0 })
if (existing.docs[0]) { console.log(`Demo already exists: /en/events/${existing.docs[0].id}`); await payload.destroy(); process.exit(0) }
const tag = async (kind: 'year' | 'event_type' | 'location', slug: string, label: string, parent?: number) => {
  const old = await payload.find({ collection: 'tags', where: { slug: { equals: slug } }, depth: 0 })
  return old.docs[0] || payload.create({ collection: 'tags', data: { kind, slug, label, parent } })
}
const year = await tag('year', 'demo-year-1', 'Year 1')
const type = await tag('event_type', 'demo-workshop', 'Workshop / กิจกรรมฝึกทักษะ')
const campus = await tag('location', 'demo-campus', 'Demo campus / วิทยาเขตตัวอย่าง')
const venue = await tag('location', 'demo-room', 'Skills room / ห้องฝึกทักษะ', campus.id)
const users = []
for (const [name, role] of [['organizer', 'admin'], ['member', 'member'], ['waitlisted', 'member'], ['new-member', 'member']] as const) {
  const email = `${name}@event-demo.test`
  const old = await payload.find({ collection: 'users', where: { email: { equals: email } }, depth: 0 })
  users.push(old.docs[0] || await payload.create({ collection: 'users', context: { isOAuthFlow: true }, data: {
    email, password: 'LocalDemoOnly-2026!', roles: [role], student_email_verified: true,
    name_english: { first_name: name, last_name: 'Demo' }, name_thai: { first_name: 'ทดสอบ', last_name: 'ระบบ' }, academic: { student_id: '1234567', year: year.id },
  } }))
}
const message: NonNullable<import('../src/payload-types').Event['participant_detail']> = { root: { type: 'root', version: 1, children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', version: 1, text: 'Recorded / บันทึกแล้ว', format: 0, detail: 0, mode: 'normal', style: '' }], direction: null, format: '', indent: 0 }], direction: null, format: '', indent: 0 } }
const form = await payload.create({ collection: 'forms', user: users[0], data: { title: 'Demo application / ใบสมัครตัวอย่าง', confirmationMessage: message, disableConfirmationEmail: true, fields: [{ blockType: 'text', name: 'reason', label: 'Why would you like to join? / เหตุผลที่สมัคร', required: true }, { blockType: 'userProfile', name: 'student', label: 'Student ID / รหัสนักศึกษา', profileField: 'academic.student_id', readOnly: true }] } as any })
const at = (days: number) => new Date(Date.now() + days * 86400000).toISOString()
const parent = await payload.create({ collection: 'events', user: users[0], data: { name: 'Local demo: Surgical Skills Weekend', event_type: type.id, event_structure: 'multi_day', registration_selection_mode: 'manual', date_begin: at(2), date_end: at(5), location: venue.id, subscription_form: form.id, description: 'Synthetic local preview. One application, two independent day registrations. ข้อมูลตัวอย่างสำหรับทดสอบในเครื่อง', participant_detail: message } })
const days = []
for (const [index, mode] of ['manual', 'confirmed'].entries()) days.push(await payload.create({ collection: 'events', user: users[0], data: { name: index ? 'Day 2: Suturing / วันที่ 2 เย็บแผล' : 'Day 1: Surgical skills / วันที่ 1 ทักษะศัลยกรรม', event_structure: 'day', parent_event: parent.id, event_type: type.id, date_begin: at(index + 3), registration_selection_mode: mode, participant_limit: 1, max_waiting_list: 3, location: venue.id, participant_detail: message } as any }))
for (const user of users.slice(1, 3)) await applyToEvent(payload, user, parent.id, { reason: 'Local demo application', student: 'ignored: server uses profile' }, days.map(day => day.id))
const registration = (await payload.find({ collection: 'registrations', where: { and: [{ event: { equals: days[0].id } }, { user: { equals: users[1].id } }] }, depth: 0 })).docs[0]
await payload.update({ collection: 'registrations', id: registration.id, data: { status: 'accepted' }, context: { skipNotifications: true } })
for (const event of [parent, ...days]) {
  const reflection = await payload.create({ collection: 'forms', user: users[0], data: { title: `Demo reflection: ${event.name}`, confirmationMessage: message, disableConfirmationEmail: true, fields: [{ blockType: 'textarea', name: 'reflection', label: 'What did you learn? / สิ่งที่ได้เรียนรู้', required: true }] } as any })
  await payload.update({ collection: 'events', id: event.id, data: { reflection_form: reflection.id, reflection_deadline: at(8) }, context: { skipNotifications: true } })
}
console.log(`Demo: /en/events/${parent.id}. Synthetic logins: organizer@event-demo.test, member@event-demo.test, new-member@event-demo.test; password LocalDemoOnly-2026!`)
await payload.destroy()
process.exit(0)
