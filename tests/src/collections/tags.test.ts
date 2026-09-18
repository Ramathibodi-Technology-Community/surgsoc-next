import { describe, expect, it } from 'vitest'
import { Tags } from '@/collections/Tags'
import type { Where } from 'payload'

/**
 * `filterOptions` is not just dropdown decoration — Payload runs it to validate
 * the written value, so an expression that matches nothing rejects the write.
 *
 * It got both edge cases wrong at once: on a create there is no `id`, and
 * `{ id: { not_equals: undefined } }` matched nothing, so seeding a venue under
 * its campus failed with "The following field is invalid: Parent".
 */
const parentField = (Tags.fields as Array<Record<string, any>>).find((f) => f.name === 'parent')!
const filter = (args: { id?: string | number; data?: Record<string, unknown> }): Where =>
  parentField.filterOptions(args)

describe('Tags.parent filterOptions', () => {
  it('constrains to the same vocabulary on a create, without an id clause', () => {
    expect(filter({ id: undefined, data: { kind: 'location' } })).toEqual({
      and: [{ kind: { equals: 'location' } }],
    })
  })

  it('excludes self once there is an id to exclude', () => {
    expect(filter({ id: 5, data: { kind: 'location' } })).toEqual({
      and: [{ kind: { equals: 'location' } }, { id: { not_equals: 5 } }],
    })
  })

  it('does not fail closed when a partial update carries no kind', () => {
    // A PATCH sending only `parent` has no kind to match on. Rejecting it would
    // break a legitimate edit; `parent` carries no privilege, so it stays open.
    expect(filter({ id: 5, data: {} })).toEqual({ and: [{ id: { not_equals: 5 } }] })
    expect(filter({ data: {} })).toEqual({})
  })

  it('never emits a clause with an undefined operand', () => {
    for (const args of [{}, { id: 5 }, { data: { kind: 'year' } }, { id: 5, data: { kind: 'year' } }]) {
      const json = JSON.stringify(filter(args))
      expect(json).not.toContain('null')
      expect(json).not.toContain('undefined')
    }
  })
})
