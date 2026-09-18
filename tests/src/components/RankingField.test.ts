import { describe, it, expect, vi } from 'vitest'
import RankingField from '@/components/FormFields/RankingField'

/**
 * RankingField used to keep its own `items` state synced from `options`/`value`
 * via a `useEffect`. Any parent re-render that produced a new-but-equal
 * `options`/`value` array (a fresh `.map()` result, for instance) re-ran that
 * effect and threw away whatever order the user had just dragged into place.
 *
 * The fix makes the component fully controlled: it renders straight from
 * props with no internal state, so it no longer has hooks at all. That means
 * it can be exercised directly as a plain function (same pattern as
 * FormField.test.ts) instead of needing a real renderer — walk the returned
 * element tree to find the "move down" button and click it.
 */

type ReactNode = any

function findAll(node: ReactNode, predicate: (n: ReactNode) => boolean, out: ReactNode[] = []): ReactNode[] {
  if (node == null || typeof node !== 'object') return out
  if (Array.isArray(node)) {
    node.forEach((child) => findAll(child, predicate, out))
    return out
  }
  if (predicate(node)) out.push(node)
  const children = node.props?.children
  if (children !== undefined) findAll(children, predicate, out)
  return out
}

function itemLabels(tree: ReactNode): string[] {
  const spans = findAll(tree, (n) => n?.props?.className?.includes?.('font-medium') && n?.type === 'span')
  return spans.map((s) => s.props.children)
}

describe('RankingField', () => {
  it('reorder survives a parent re-render that passes a new-but-equal options array', () => {
    const options1 = ['Alpha', 'Beta', 'Gamma']
    const onChange1 = vi.fn()

    const render1 = RankingField({
      label: 'Rank',
      options: options1,
      value: [],
      onChange: onChange1,
    })

    expect(itemLabels(render1)).toEqual(['Alpha', 'Beta', 'Gamma'])

    // User drags/clicks "move down" on the first item (Alpha -> index 1).
    const moveDownButtons = findAll(render1, (n) => n?.props?.['aria-label'] === 'Move down')
    moveDownButtons[0].props.onClick()

    expect(onChange1).toHaveBeenCalledWith(['Beta', 'Alpha', 'Gamma'])
    const reordered = onChange1.mock.calls[0][0]

    // Parent re-renders: `options` gets a brand-new array identity (e.g. a
    // fresh .map() over the same field config) and `value` is the order the
    // parent now holds from onChange above.
    const options2 = ['Alpha', 'Beta', 'Gamma'] // same content, different identity
    expect(options2).not.toBe(options1)

    const render2 = RankingField({
      label: 'Rank',
      options: options2,
      value: reordered,
      onChange: vi.fn(),
    })

    // The reorder must survive — it must NOT snap back to `options` order.
    expect(itemLabels(render2)).toEqual(['Beta', 'Alpha', 'Gamma'])
  })
})
