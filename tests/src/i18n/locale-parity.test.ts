import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const localesDir = path.resolve(__dirname, '../../../src/i18n/locales')

function leafKeys(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) {
    return value.length === 0
      ? [prefix]
      : value.flatMap((child, index) => leafKeys(child, `${prefix}.${index}`))
  }
  if (value === null || typeof value !== 'object') return [prefix]
  return Object.entries(value).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key),
  )
}

function load(locale: string, file: string): unknown {
  return JSON.parse(readFileSync(path.join(localesDir, locale, file), 'utf8'))
}

const files = readdirSync(path.join(localesDir, 'en')).filter((f) => f.endsWith('.json'))

describe('locale dictionaries', () => {
  it('ship the same namespace files for en and th', () => {
    const thFiles = readdirSync(path.join(localesDir, 'th')).filter((f) => f.endsWith('.json'))
    expect(thFiles.sort()).toEqual([...files].sort())
  })

  it.each(files)('%s has identical key sets in en and th', (file) => {
    const en = new Set(leafKeys(load('en', file)))
    const th = new Set(leafKeys(load('th', file)))
    expect({
      missingInTh: [...en].filter((k) => !th.has(k)).sort(),
      missingInEn: [...th].filter((k) => !en.has(k)).sort(),
    }).toEqual({ missingInTh: [], missingInEn: [] })
  })
})
