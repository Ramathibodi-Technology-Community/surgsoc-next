import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Libs under test import the Payload config for their runtime lookups.
      // Tests only exercise the pure helpers beside those lookups, so the
      // specifier just has to resolve to something — it is never read.
      '@payload-config': path.resolve(__dirname, './tests/payload-config.stub.ts'),
    },
  },
})
