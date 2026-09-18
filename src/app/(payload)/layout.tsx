import config from '@payload-config'
import '@payloadcms/next/css'
import { RootLayout } from '@payloadcms/next/layouts'
import { connection } from 'next/server'
import React from 'react'
import { importMap } from './admin/importMap'
import { serverFunction } from './actions'
import { Toaster } from 'sonner'

// Every view under here is session-gated (Payload's own auth check reads
// `new Date()`/cookies on every request), so there is no static shell to
// produce. `instant = false` tells cacheComponents this route is allowed to
// block on the server instead of failing the build looking for one.
export const instant = false

const Layout = async ({ children }: { children: React.ReactNode }) => {
  // Payload's own RootLayout calls `new Date()` while authenticating the
  // admin session — a real per-request value cacheComponents refuses to
  // prerender. The admin is never static anyway (every view is session-gated),
  // so opt the whole segment out of prerendering rather than fight the check.
  await connection()

  return (
    <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
      {children}
      {/* Our admin components call sonner's toast(); without a Toaster from the
          same copy of sonner those calls render nothing. */}
      <Toaster richColors position="bottom-right" />
    </RootLayout>
  )
}

export default Layout
