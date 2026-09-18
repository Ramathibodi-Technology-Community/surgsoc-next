import { describe, expect, it } from 'vitest'
import { isSampleField, sampleWhere } from '@/libs/sample-data'

describe('sampleWhere', () => {
  it('hides sample records when the toggle is off', () => {
    expect(sampleWhere(false)).toEqual({ is_sample: { not_equals: true } })
  })

  it('adds no constraint when the toggle is on', () => {
    // Spread into a query, so it has to be an empty object rather than
    // undefined — `{ ...undefined }` works, but `where: undefined` does not.
    expect(sampleWhere(true)).toEqual({})
  })

  it('uses not_equals so rows predating the column still show', () => {
    /*
      The whole point of this assertion. Payload compiles `not_equals` to
      `col IS NULL OR col <> value`; `equals: false` compiles to `col = false`,
      and in SQL `NULL = false` is NULL, not true. Swapping the operator would
      hide every record written before `is_sample` existed — every real user,
      event and attending — while still passing a test that only checked
      "samples are excluded".
    */
    expect(sampleWhere(false)).not.toHaveProperty('is_sample.equals')
  })

  it('filters the column the field actually declares', () => {
    // A rename on one side and not the other silently stops hiding anything.
    expect(Object.keys(sampleWhere(false))).toEqual([isSampleField.name])
  })
})
