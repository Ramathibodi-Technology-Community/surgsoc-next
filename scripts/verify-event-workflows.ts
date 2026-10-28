import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { applyToEvent } from '../src/libs/event-application'
import { inEventTransaction, lockEvent } from '../src/libs/event-workflow'
import { idOf } from '../src/libs/form-assignment-lifecycle'
import { reconcileEventReflection } from '../src/libs/form-assignment-lifecycle'

// This verifier owns a disposable database, never the normal development database.
const url = new URL(process.env.DATABASE_URL || '')
assert.equal(url.hostname, '127.0.0.1')
assert.equal(url.pathname, '/surgsoc_events_test')
const payload = await getPayload({ config })
const prefix = `event-verifier-${randomUUID()}`
const pool = payload.db.pool
const tag = (await pool.query(`INSERT INTO tags(kind,label,slug) VALUES('event_type','Verification',$1) RETURNING id`, [prefix])).rows[0].id
const year = (await pool.query(`INSERT INTO tags(kind,label,slug) VALUES('year','Year 1',$1) RETURNING id`, [prefix+'-year'])).rows[0].id
const users = []
for (let i = 0; i < 4; i++) {
  const row = (await pool.query(`INSERT INTO users(email,student_email_verified,name_thai_first_name,name_thai_last_name,academic_student_id,academic_year_id) VALUES($1,true,'ทดสอบ','ระบบ','1234567',$2) RETURNING id`, [`${prefix}-${i}@student.mahidol.edu`, year])).rows[0]
  await pool.query(`INSERT INTO users_roles("order",parent_id,value) VALUES(1,$1,'member')`, [row.id])
  users.push(await payload.findByID({ collection: 'users', id: row.id, depth: 2 }))
}
const message = { root: { type: 'root', version: 1, direction: null, format: '', indent: 0, children: [{ type: 'paragraph', version: 1, direction: null, format: '', indent: 0, children: [{ type: 'text', version: 1, text: 'Recorded', format: 0, detail: 0, mode: 'normal', style: '' }] }] } }
const form = await payload.create({ collection: 'forms', data: { title: prefix, confirmationMessage: message, fields: [{ blockType: 'text', name: 'reason', label: 'Reason', required: true }], disableConfirmationEmail: true } as any })
const start = new Date(Date.now() + 86400000).toISOString()
const end = new Date(Date.now() + 4 * 86400000).toISOString()
const parent = await payload.create({ collection: 'events', data: { name: prefix, event_type: tag, event_structure: 'multi_day', registration_selection_mode: 'manual', date_begin: start, date_end: end, subscription_form: form.id } })
const days: import('../src/payload-types').Event[] = []
for (let i = 0; i < 2; i++) days.push(await payload.create({ collection: 'events', data: { name: `${prefix} day ${i}`, event_type: tag, event_structure: 'day', parent_event: parent.id, date_begin: new Date(Date.now() + (i + 2) * 86400000).toISOString(), participant_limit: 1, max_waiting_list: 1, registration_selection_mode: 'confirmed' } }))
const dayIds = days.map(day => day.id)
await applyToEvent(payload, users[0], parent.id, { reason: 'Both days' }, dayIds)
let regs = await payload.find({ collection: 'registrations', where: { user: { equals: users[0].id } }, depth: 0, pagination: false })
assert.equal(regs.totalDocs, 2)
assert.equal(new Set(regs.docs.map(row => idOf(row.submission))).size, 1)
assert(regs.docs.every(row => row.status === 'confirmed'))
await applyToEvent(payload, users[1], parent.id, { reason: 'Waiting' }, dayIds)
regs = await payload.find({ collection: 'registrations', where: { user: { equals: users[1].id } }, depth: 0, pagination: false })
assert(regs.docs.every(row => row.status === 'subscribed'))
await assert.rejects(applyToEvent(payload, users[0], parent.id, { reason: 'Duplicate' }, [days[0].id]), /already applied/)
await assert.rejects(applyToEvent(payload, users[2], parent.id, { reason: 'Full' }, dayIds), /waiting list is full/)
assert.equal((await payload.count({ collection: 'form-submissions', where: { user: { equals: users[2].id } } })).totalDocs, 0)
// Late-added parent/day forms reconcile independently and remain dormant.
for (const event of [parent, ...days]) {
  const reflection = await payload.create({ collection: 'forms', data: { title: `${prefix}-reflection-${event.id}`, confirmationMessage: message, fields: [{ blockType: 'text', name: 'reflection', required: true }], disableConfirmationEmail: true } as any })
  await payload.update({ collection: 'events', id: event.id, data: { reflection_form: reflection.id, reflection_deadline: new Date(Date.parse(end) + 86400000).toISOString() } })
}
let assignments = await payload.find({ collection: 'form-assignments', where: { user: { equals: users[0].id } }, depth: 0, pagination: false })
assert.equal(assignments.totalDocs, 3)
assert(assignments.docs.every(row => Date.parse(row.active_at!) > Date.now() && !row.cancelled_at))
await reconcileEventReflection(payload, await payload.findByID({ collection: 'events', id: parent.id, depth: 0 }))
assert.equal((await payload.count({ collection: 'form-assignments', where: { user: { equals: users[0].id } } })).totalDocs, 3)
const parentReflection = (await payload.findByID({ collection: 'events', id: parent.id, depth: 0 })).reflection_form
await assert.rejects(payload.update({ collection: 'events', id: days[0].id, data: { reflection_form: Number(idOf(parentReflection)) } }), /distinct forms/)
const occupant = (await payload.find({ collection: 'registrations', where: { and: [{ user: { equals: users[0].id } }, { event: { equals: days[0].id } }] }, depth: 0 })).docs[0]
await inEventTransaction(payload, async req => { req.context.skipNotifications = true; await lockEvent(payload, parent.id, req); await lockEvent(payload, days[0].id, req); await payload.update({ collection: 'registrations', id: occupant.id, data: { status: 'declined' }, req }) })
const promoted = (await payload.find({ collection: 'registrations', where: { and: [{ user: { equals: users[1].id } }, { event: { equals: days[0].id } }] }, depth: 0 })).docs[0]
assert.equal(promoted.status, 'confirmed')
assignments = await payload.find({ collection: 'form-assignments', where: { user: { equals: users[0].id } }, depth: 0, pagination: false })
assert(assignments.docs.find(row => String(idOf(row.source_event)) === String(days[0].id))!.cancelled_at)
assert(!assignments.docs.find(row => String(idOf(row.source_event)) === String(parent.id))!.cancelled_at)
const otherDay = (await payload.find({ collection: 'registrations', where: { and: [{ user: { equals: users[0].id } }, { event: { equals: days[1].id } }] }, depth: 0 })).docs[0]
await inEventTransaction(payload, async req => { req.context.skipNotifications = true; await lockEvent(payload, parent.id, req); await payload.update({ collection: 'registrations', id: otherDay.id, data: { status: 'declined' }, req }) })
assignments = await payload.find({ collection: 'form-assignments', where: { user: { equals: users[0].id } }, depth: 0, pagination: false })
assert(assignments.docs.every(row => row.cancelled_at))
const race = await Promise.allSettled([applyToEvent(payload, users[2], parent.id, { reason: 'Race' }, [days[0].id]), applyToEvent(payload, users[3], parent.id, { reason: 'Race' }, [days[0].id])])
assert.equal(race.filter(result => result.status === 'fulfilled').length, 1)
assert.equal((await payload.count({ collection: 'registrations', where: { and: [{ event: { equals: days[0].id } }, { status: { equals: 'confirmed' } }] } })).totalDocs, 1)
// Event owners may maintain joining instructions, but cannot reassign privileged relationships.
const eventGroup = await payload.create({ collection: 'groups', data: { name: prefix, slug: prefix, type: 'access' } })
await payload.update({ collection: 'events', id: parent.id, data: { owner: users[0].id, groups: [eventGroup.id] } })
await payload.update({ collection: 'events', id: parent.id, data: { participant_detail: message as any }, user: users[0], overrideAccess: false })
assert.deepEqual((await payload.findByID({ collection: 'events', id: parent.id, depth: 0 })).participant_detail, message)
for (const data of [{ owner: users[1].id }, { coordinator: users[1].id }, { groups: [] }]) await assert.rejects(payload.update({ collection: 'events', id: parent.id, data, user: users[0], overrideAccess: false }), /Only event managers/)
await assert.rejects(payload.update({ collection: 'events', id: parent.id, data: { name: 'Unauthorized edit' }, user: users[1], overrideAccess: false }))
await payload.update({ collection: 'events', id: parent.id, data: { is_visible: false } })
const hidden = await payload.find({ collection: 'events', where: { id: { in: dayIds } }, overrideAccess: false, user: users[0] })
assert.equal(hidden.totalDocs, 0)
console.log('PASS: shared submission, daily capacity, waitlist, duplicate rejection, atomic rollback, promotion, concurrency, hidden-parent API access, independent reflections, late reconciliation, dormant cancellation and staff editing authorization.')
await payload.destroy()
process.exit(0)
