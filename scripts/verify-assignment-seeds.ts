#!/usr/bin/env node
import assert from 'node:assert/strict'
import { getPayloadInstance } from './shared.js'
import { assignmentState, reconcileAnnualSurvey, reconcileEventReflection } from '../src/libs/form-assignment-lifecycle.js'
import { getBlockingForms } from '../src/libs/form-blocking.js'

const one = async (payload: any, collection: any, where: any) => {
  const result = await payload.find({ collection, where, limit: 1, depth: 1, overrideAccess: true })
  assert.equal(result.totalDocs, 1, `${collection} fixture missing`)
  return result.docs[0]
}

const idOf = (value: any) => typeof value === 'object' && value ? value.id : value

async function main() {
  const payload = await getPayloadInstance()
  const [workshop, lateEvent, noReflection, earlyEvent] = await Promise.all([
    one(payload, 'events', { name: { equals: 'Basic Surgical Skills Workshop' } }),
    one(payload, 'events', { name: { equals: 'Reflection Added Later (seed fixture)' } }),
    one(payload, 'events', { name: { equals: 'No Reflection Form (seed fixture)' } }),
    one(payload, 'events', { name: { equals: 'Early Reflection Release (seed fixture)' } }),
  ])
  const [member, member2, member3, member4, lateMember] = await Promise.all([
    one(payload, 'users', { email: { equals: 'member@test.com' } }),
    one(payload, 'users', { email: { equals: 'member2@test.com' } }),
    one(payload, 'users', { email: { equals: 'member3@test.com' } }),
    one(payload, 'users', { email: { equals: 'member4@test.com' } }),
    one(payload, 'users', { email: { equals: 'late-member@test.com' } }),
  ])

  const assignmentFor = async (event: any, user: any) => {
    const result = await payload.find({ collection: 'form-assignments', where: { and: [{ source_event: { equals: event.id } }, { user: { equals: user.id } }] }, limit: 1, depth: 1, overrideAccess: true })
    return result.docs[0] ?? null
  }
  const dormant = await assignmentFor(workshop, member)
  assert.ok(dormant, 'confirmed participant needs a reflection assignment')
  assert.equal(assignmentState(dormant), 'dormant', 'event-end reflection stays dormant')
  assert.equal(await assignmentFor(noReflection, member3), null, 'event without reflection form creates nothing')
  const late = await assignmentFor(lateEvent, member2)
  assert.ok(late, 'adding a reflection form later reconciles confirmed users')
  assert.equal(late.completed, true, 'late active reflection is submittable and completes')
  assert.ok(late.submission, 'completion retains the exact submission')
  const early = await assignmentFor(earlyEvent, member4)
  assert.ok(early, 'early-release event assigns confirmed users')
  assert.equal(assignmentState(early), 'pending', 'early release is immediately active')

  const immediate = await one(payload, 'forms', { title: { equals: 'Annual Survey — immediate activation' } })
  const future = await one(payload, 'forms', { title: { equals: 'Annual Survey — future activation' } })
  const overdue = await one(payload, 'forms', { title: { equals: 'Annual Survey — overdue blocker' } })
  const previous = await one(payload, 'forms', { title: { equals: 'Annual Survey — previous year' } })
  const surveys = await payload.find({ collection: 'form-assignments', where: { user: { equals: lateMember.id } }, limit: 0, depth: 0, overrideAccess: true })
  const count = (form: any) => surveys.docs.filter((row: any) => String(idOf(row.form)) === String(form.id)).length
  assert.equal(count(immediate), 1, 'late member receives immediate annual survey once')
  assert.equal(count(future), 1, 'late member receives future annual survey once')
  assert.equal(count(overdue), 1, 'late member receives overdue annual survey once')
  assert.equal(count(previous), 0, 'late member does not receive last academic year survey')
  const futureRow = surveys.docs.find((row: any) => String(idOf(row.form)) === String(future.id))
  assert.ok(futureRow, 'future survey assignment missing')
  assert.equal(assignmentState(futureRow), 'dormant', 'future annual activation stays dormant')
  assert.ok((await getBlockingForms(payload, lateMember.id)).some((row: any) => String(idOf(row.form)) === String(overdue.id)), 'overdue annual survey blocks registration')

  assert.equal((await reconcileEventReflection(payload, workshop)).created, 0, 'event reconciliation is idempotent')
  assert.equal((await reconcileAnnualSurvey(payload, immediate, [lateMember.id])).created, 0, 'annual reconciliation is idempotent')
  const all = await payload.find({ collection: 'form-assignments', limit: 0, depth: 0, overrideAccess: true })
  const pairs = all.docs.map((row: any) => `${idOf(row.form)}:${idOf(row.user)}`)
  assert.equal(new Set(pairs).size, pairs.length, 'unique form/user assignment invariant')
  console.log(`✅ assignment seed verification passed (${all.totalDocs} assignments)`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`❌ assignment seed verification failed: ${error.message}`)
    process.exit(1)
  })
