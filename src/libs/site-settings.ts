import config from '@payload-config'
import { getPayload } from 'payload'
import { cacheTag } from 'next/cache'

/** Shared by the reader below and the global's afterChange hook. */
export const SITE_SETTINGS_TAG = 'site-settings'

function isMissingRelationError(error: unknown, relationName: 'site_settings'): boolean {
  const e = error as {
    message?: string
    code?: string
    cause?: {
      code?: string
      message?: string
    }
  }

  const code = e?.code || e?.cause?.code || ''
  if (code === '42P01') {
    return true
  }

  const message = `${e?.message || ''} ${e?.cause?.message || ''}`.toLowerCase()
  return message.includes('does not exist') && message.includes(relationName)
}

/** Trimmed string, or null when the field is blank — so a cleared field falls back. */
function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

/**
 * Cached because this is on the critical path of EVERY route — layout
 * metadata, Header, Footer — so an uncached read here is what keeps the whole
 * site dynamic under `cacheComponents`. Caching at this one shared function
 * covers all callers; caching at each caller would not.
 *
 * Invalidated by the `revalidate-site-settings` hook on the global, so an
 * admin edit appears immediately rather than after the cacheLife expires.
 */
export async function getSiteSettings() {
  'use cache'
  cacheTag(SITE_SETTINGS_TAG)
  const payload = await getPayload({ config })
  let global: Record<string, unknown> = {}

  try {
    global = (await (payload as any).findGlobal({
      slug: 'site-settings',
      depth: 0,
      overrideAccess: true,
    })) as Record<string, unknown>
  } catch (error) {
    // During rollout, globals tables may not exist yet; use defaults instead of crashing.
    if (!isMissingRelationError(error, 'site_settings')) {
      throw error
    }
  }

  return {
    siteName: text(global.siteName) ?? 'Ramathibodi Surgical Society',
    shortName: text(global.shortName) ?? 'RASS',
    metaDescription: text(global.metaDescription) ?? 'Ramathibodi Surgical Society Website',
    enableI18n: typeof global.enableI18n === 'boolean' ? global.enableI18n : true,
    // Defaults to false, and stays false when the globals table is missing —
    // a failed read must not be what exposes test records to the public site.
    showSampleData: global.showSampleData === true,
    // Same fail-safe: a failed/missing read must never open the password-reset
    // endpoints, so this defaults to false rather than true.
    enablePasswordReset: global.enablePasswordReset === true,
  }
}
