import type { CheckboxField, Where } from 'payload'

/**
 * The `is_sample` flag and the query fragment that honours it.
 *
 * Both live here because they have to agree on the column name: a field
 * declared in one file and filtered by a string literal in another is how a
 * rename silently stops hiding anything.
 *
 * Deliberately a checkbox rather than a `tags` row. Tags are a display
 * vocabulary — every field that holds one is typed to a single kind
 * (`event_type`, `department`), and none of the three collections has a free
 * tag list to drop a "sample" row into. Adding one to carry a boolean would be
 * a join table to store one bit.
 */
export const isSampleField: CheckboxField = {
  name: 'is_sample',
  type: 'checkbox',
  label: 'Sample Data',
  defaultValue: false,
  admin: {
    position: 'sidebar',
    description:
      'Demo or test record. Hidden from the public site and left out of the home page counts, unless Site Settings → Show Sample Data is on.',
  },
}

/**
 * Where-clause fragment that hides sample records, or `{}` when they are shown.
 *
 * `not_equals` rather than `equals: false` on purpose: Payload compiles
 * `not_equals` to `col IS NULL OR col <> value`, so rows written before the
 * column existed — which are NULL, not false — still pass. Plain
 * `equals: false` would hide every pre-existing record, because in SQL
 * `NULL = false` is NULL, not true.
 *
 * Spread it into a query: `where: { ...mine, ...sampleWhere(show) }`.
 */
export function sampleWhere(showSampleData: boolean): Where {
  return showSampleData ? {} : { is_sample: { not_equals: true } }
}
