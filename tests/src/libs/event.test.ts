import { describe, expect, it } from 'vitest'
import { posterUrl } from '@/libs/event'

describe('posterUrl', () => {
  it('turns a Google Drive share link into an image URL', () => {
    expect(posterUrl('https://drive.google.com/file/d/1hv_5klGA-Il54vcsrf6I1N97nMJsKV5N')).toBe(
      'https://drive.google.com/uc?export=view&id=1hv_5klGA-Il54vcsrf6I1N97nMJsKV5N',
    )
  })
})
