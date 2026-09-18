import config from '@payload-config'
import '@payloadcms/next/css'
import { RootLayout } from '@payloadcms/next/layouts'
import React from 'react'
import { importMap } from './admin/importMap'
import { serverFunction } from './actions'
import { Toaster } from 'sonner'

const Layout = ({ children }: { children: React.ReactNode }) => (
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    {children}
    {/* Our admin components call sonner's toast(); without a Toaster from the
        same copy of sonner those calls render nothing. */}
    <Toaster richColors position="bottom-right" />
  </RootLayout>
)

export default Layout
