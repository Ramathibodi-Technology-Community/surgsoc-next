import { withPayload } from '@payloadcms/next/withPayload'

const isDev = process.env.NODE_ENV !== 'production'

const cspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline' https://vercel.live${isDev ? " 'unsafe-eval'" : ''}`,
  `connect-src 'self' https://vercel.live wss://ws-us3.pusher.com${isDev ? ' ws: wss:' : ''}`,
  "frame-src 'self' https://accounts.google.com https://vercel.live",
]

if (!isDev) {
  cspDirectives.push('upgrade-insecure-requests')
}

const contentSecurityPolicy = cspDirectives.join('; ')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Partial Prerendering. Without it, a headers() call ANYWHERE in a route's
  // tree opts the WHOLE route out of static generation — which is why the
  // HeaderAuth <Suspense> split alone left all 31 routes dynamic. Suspense is
  // a streaming boundary; this flag is what also makes it a prerender cut
  // point. `experimental.ppr` folded into this top-level flag in Next 16.
  cacheComponents: true,
  serverExternalPackages: ['@payloadcms/db-postgres'],
  images: {
    // Google account avatars (OAuth users have a lh3.googleusercontent.com photo).
    remotePatterns: [{ protocol: 'https', hostname: 'lh3.googleusercontent.com' }],
  },
  async headers() {
    const baseHeaders = [
      {
        key: 'Content-Security-Policy',
        value: contentSecurityPolicy,
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()'
      },
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'off',
      },
      {
        key: 'X-Permitted-Cross-Domain-Policies',
        value: 'none',
      },
      {
        key: 'Cross-Origin-Opener-Policy',
        value: 'same-origin',
      },
      {
        key: 'Cross-Origin-Resource-Policy',
        value: 'same-origin',
      },
      {
        key: 'Origin-Agent-Cluster',
        value: '?1',
      },
    ]

    if (!isDev) {
      baseHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
      })
    }

    return [
      {
        source: '/(.*)',
        headers: baseHeaders,
      },
    ]
  },
}

export default withPayload(nextConfig)
