import { z } from 'zod'

/**
 * Environment preflight.
 *
 * The point is not "validate env" in the abstract — it is to turn LATE and
 * SILENT failures into one loud failure at startup. Two categories, treated
 * differently on purpose:
 *
 *   - Required: absent means the app cannot work. Throw, naming the variable.
 *   - Should-warn: absent means a feature quietly no-ops. `sender.ts:45`
 *     returns `{ success: false }` with no RESEND_API_KEY, and callers report
 *     success to the user anyway — a password-reset email that was never sent
 *     looks identical to one that was. That is the failure this file exists
 *     for. It warns rather than throws: a dev with no Resend key should still
 *     be able to run the site.
 *
 * ONE call site, in payload.config.ts, because that module is the single thing
 * both the server and every script load. Scripts therefore inherit the full
 * required set including GOOGLE_* — which they do not strictly need, but a
 * seeded database whose accounts cannot be signed into is not a useful one,
 * and a second narrower entry point would be an abstraction with one caller.
 */

// Present but still unset — the shapes in .env.example. An unedited copy of
// that file is the common case and it reads as "configured".
const PLACEHOLDERS = new Set([
  'YOUR_SECRET_HERE',
  'your-super-secret-key-here',
  'your-google-client-id',
  'your-google-client-secret',
])

const REQUIRED = [
  'PAYLOAD_SECRET',
  'DATABASE_URL',
  'NEXT_PUBLIC_SERVER_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
] as const

const value = (name: string) =>
  z
    .string({ error: `${name} is not set.` })
    .min(1, `${name} is empty.`)
    .refine((v) => !PLACEHOLDERS.has(v), `${name} is still the placeholder from .env.example.`)

/**
 * Throws on any missing/placeholder required variable, warns on the silent
 * ones, and returns PAYLOAD_SECRET so the config can use the value this has
 * already vouched for instead of re-reading it.
 */
export function assertAppEnv(env: NodeJS.ProcessEnv = process.env): string {
  const errors = REQUIRED.flatMap((name) => {
    const r = value(name).safeParse(env[name])
    return r.success ? [] : r.error.issues.map((i) => i.message)
  })

  // Production-only: SEED_PASSWORD makes every seeded account — superadmin
  // included — reachable through the local email+password strategy, which is
  // deliberately still enabled. Harmless locally, a standing login in prod.
  if (env.NODE_ENV === 'production' && env.SEED_PASSWORD) {
    errors.push(
      'SEED_PASSWORD must not be set in production — it is a known password for every seeded account.',
    )
  }

  if (errors.length) {
    throw new Error(
      `\n❌ Environment preflight failed:\n${errors.map((e) => `   • ${e}`).join('\n')}\n` +
        `   See .env.example for the expected values.\n`,
    )
  }

  if (!env.RESEND_API_KEY) {
    console.warn(
      '⚠️  RESEND_API_KEY unset — email silently no-ops. Password reset will report success and send nothing.',
    )
  }
  if (!env.EMAIL_FROM) {
    console.warn(
      '⚠️  EMAIL_FROM unset — falling back to noreply@surgsoc.mahidol.edu, which Resend rejects unless that domain is verified.',
    )
  }

  return env.PAYLOAD_SECRET as string
}
