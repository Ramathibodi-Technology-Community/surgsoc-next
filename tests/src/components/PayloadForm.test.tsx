// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeAll } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import PayloadForm from '@/components/PayloadForm'

/**
 * PayloadForm used to re-run its prefill in a `useEffect` keyed on
 * `[user, form.fields]`. `form.fields` is a plain object/array prop that gets
 * a fresh identity on most parent re-renders, so the effect re-fired and
 * overwrote whatever the user had already typed into a prefilled field.
 *
 * Proving that needs a real render plus a real re-render with state preserved
 * across them — two independent calls would not catch it — hence the DOM
 * environment on this one file rather than repo-wide.
 */
beforeAll(() => {
  ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
})

describe('PayloadForm prefill', () => {
  it('does not overwrite user-typed input when form.fields gets a new-but-equal identity', async () => {
    const user = { name_english: { first_name: 'Ann' } }
    const fieldsV1 = [{ blockType: 'text', name: 'first_name', label: 'First name' }]

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        React.createElement(PayloadForm, {
          form: { fields: fieldsV1 } as any,
          onSubmit: vi.fn(),
          user,
        }),
      )
    })

    const input = container.querySelector('#first_name') as any
    expect(input.value).toBe('Ann') // sanity: prefill still works

    // User types over the prefilled value.
    const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      nativeSetter.call(input, 'Bob')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(input.value).toBe('Bob')

    // Parent re-renders with a brand-new `fields` array identity (same
    // content) — this is what used to re-trigger the prefill effect.
    const fieldsV2 = [{ blockType: 'text', name: 'first_name', label: 'First name' }]
    expect(fieldsV2).not.toBe(fieldsV1)

    await act(async () => {
      root.render(
        React.createElement(PayloadForm, {
          form: { fields: fieldsV2 } as any,
          onSubmit: vi.fn(),
          user,
        }),
      )
    })

    expect(input.value).toBe('Bob') // must not be reverted to the prefilled 'Ann'
  })
})
