import { describe, expect, it, test } from 'vitest'
import { ResourceScheduling, registrationCutoff } from '@/libs/resource-scheduling'

test('registration closes at the earlier of event end and explicit close', () => {
  expect(registrationCutoff('2026-10-02T00:00:00Z', '2026-10-01T00:00:00Z'))
    .toBe('2026-10-01T00:00:00Z')
  expect(registrationCutoff('2026-10-01T00:00:00Z', '2026-10-02T00:00:00Z'))
    .toBe('2026-10-01T00:00:00Z')
  expect(ResourceScheduling.isOpen({ closes_at: '2020-01-01T00:00:00Z', status_override: 'open' }).isOpen)
    .toBe(false)
})

/**
 * `getStatusMessage` is rendered verbatim on the event detail page, under the
 * action it explains. It used to call a bare `toLocaleString()`, which takes the
 * *server's* locale and zone — so the string read "Closed at 9/14/2026,
 * 9:57:39 AM" on a site that writes every other date as "Sun 14 Sept, 09:57" in
 * Bangkok time, and a machine in another region would have printed something
 * different again.
 *
 * That is the failure this file exists to catch: it passes on a machine set to
 * en-US/Asia/Bangkok whether or not the formatting is pinned, so the assertions
 * below name the exact expected string rather than merely checking it parses.
 */
describe('ResourceScheduling.getStatusMessage', () => {
  // 2026-03-11T06:59:59Z is 13:59 in Bangkok (UTC+7), same calendar day.
  const closesAt = '2026-03-11T06:59:59.000Z'
  // 2099 so the "not open yet" branch stays in the future as the clock moves.
  const opensAt = '2099-08-26T02:57:00.000Z'

  it('formats a past window in Bangkok time, to the minute, in past tense', () => {
    expect(ResourceScheduling.getStatusMessage({ closes_at: closesAt })).toBe(
      'Closed Wed 11 Mar, 13:59',
    )
  })

  it('formats a future window in present tense', () => {
    expect(ResourceScheduling.getStatusMessage({ opens_at: opensAt })).toBe(
      'Opens Wed 26 Aug, 09:57',
    )
  })

  it('never leaks seconds, AM/PM, or a slash-separated date', () => {
    const msg = ResourceScheduling.getStatusMessage({ closes_at: closesAt }) ?? ''
    expect(msg).not.toMatch(/\d\/\d/)
    expect(msg).not.toMatch(/\bAM\b|\bPM\b/)
    expect(msg).not.toMatch(/:\d{2}:\d{2}/)
  })

  it('says nothing while the window is open', () => {
    expect(
      ResourceScheduling.getStatusMessage({ opens_at: '2020-01-01T00:00:00.000Z', closes_at: opensAt }),
    ).toBeNull()
  })

  it('reports a manual override without inventing a date', () => {
    expect(ResourceScheduling.getStatusMessage({ status_override: 'closed' })).toBe('Closed')
  })
})
