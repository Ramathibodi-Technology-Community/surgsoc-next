import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import FormField from '@/components/FormField'

/**
 * Guards the contract that the CMS and the renderer agree on block types:
 * anything an editor can add in the admin UI must render something.
 *
 * Reads the `fields:` map out of payload.config.ts as text rather than importing
 * it — importing boots buildConfig, which needs DATABASE_URL + PAYLOAD_SECRET.
 */
function configuredBlockTypes(): string[] {
  const src = fs.readFileSync(
    path.resolve(__dirname, '../../../src/payload.config.ts'),
    'utf8',
  )
  const map = src.match(/formBuilderPlugin\(\{\s*fields: \{([\s\S]*?)\n {6}\} as any,/)
  if (!map) throw new Error('could not locate the formBuilderPlugin fields map')

  return [...map[1].matchAll(/^\s{8}(\w+):\s*(.+?),\s*$/gm)]
    .filter(([, , value]) => value !== 'false')
    .map(([, key]) => key)
}

/** Minimal field props per block type, enough for the renderer to produce output. */
const fixtures: Record<string, Record<string, unknown>> = {
  text: {},
  textarea: {},
  select: { options: [{ label: 'A', value: 'a' }] },
  radio: { options: [{ label: 'A', value: 'a' }] },
  number: {},
  email: {},
  checkbox: {},
  date: {},
  message: { message: { root: { children: [] } } },
  slider: {},
  ranking: { options: [{ label: 'A', value: 'a' }] },
  checkboxGroup: { options: [{ label: 'A', value: 'a' }] },
  userProfile: { profileField: 'email' },
}

describe('FormField block-type dispatch', () => {
  const blockTypes = configuredBlockTypes()

  it('reads the block types the CMS offers', () => {
    expect(blockTypes.length).toBeGreaterThan(5)
  })

  it.each(blockTypes)('renders a non-null element for %s', (blockType) => {
    const fixture = fixtures[blockType]
    expect(fixture, `no fixture for block type "${blockType}"`).toBeDefined()

    const rendered = FormField({
      field: { blockType, name: blockType, label: blockType, ...fixture } as never,
      value: undefined,
      onChange: () => {},
    })

    expect(rendered, `block type "${blockType}" renders null`).not.toBeNull()
  })

  it('no longer offers fileUpload (fake blob-URL success path was removed)', () => {
    expect(blockTypes).not.toContain('fileUpload')
    expect(fs.existsSync(path.resolve(__dirname, '../../../src/components/FormFields/FileUploadField.tsx'))).toBe(false)
    expect(fs.existsSync(path.resolve(__dirname, '../../../src/blocks/form-fields/FileUploadBlock.ts'))).toBe(false)
  })
})
