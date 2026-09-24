import { headers } from 'next/headers'
import { connection } from 'next/server'
import type { BasePayload } from 'payload'

// `payload.auth()` reads `new Date()` internally — a literal time read
// cacheComponents can't distinguish from a value meant to be baked into the
// static shell, so pages that prerender fail the build past it. `connection()`
// marks the boundary explicitly, the same fix as HeaderAuth.tsx and the admin
// layout (commit 871db47). Page/layout files should call this instead of
// `payload.auth({ headers: ... })` directly; server actions and route
// handlers are never prerendered, so they don't need it.
export async function getCurrentUser(payload: BasePayload) {
  await connection()
  return (await payload.auth({ headers: await headers() })).user
}
