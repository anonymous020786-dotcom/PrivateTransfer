/** @type {import('next').NextConfig} */
const { execSync } = require('child_process')

function gitSha() {
  if (process.env.NEXT_PUBLIC_COMMIT_SHA) return process.env.NEXT_PUBLIC_COMMIT_SHA
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'dev'
  }
}

// ── Content Security Policy ───────────────────────────────────────────────────
// 'unsafe-inline' is required for Next.js hydration scripts and MUI emotion styles.
// Tightening to nonce-based CSP is a future improvement once Next.js supports
// per-request nonce injection natively in standalone output mode.
const CSP = [
  "default-src 'self'",
  // Next.js inline hydration scripts + Google Tag Manager + reCAPTCHA + Cloudflare Insights
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google.com https://www.gstatic.com https://static.cloudflareinsights.com",
  // MUI emotion CSS-in-JS + Google Fonts
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Google Fonts glyphs
  "font-src 'self' https://fonts.gstatic.com data:",
  // Avatars, OG images, inline data URIs, blob URLs for ZIP downloads
  "img-src 'self' data: blob: https:",
  // API calls: Supabase, R2/S3 uploads/downloads, GA, PeerJS, Cloudflare Insights, reCAPTCHA
  "connect-src 'self' wss: https://*.supabase.co https://*.r2.cloudflarestorage.com https://*.amazonaws.com https://*.s3.amazonaws.com https://www.google-analytics.com https://www.googletagmanager.com https://analytics.google.com https://cloudflareinsights.com https://*.peerjs.com wss://*.peerjs.com https://www.google.com/recaptcha/ https://recaptchaenterprise.googleapis.com",
  // PDF/video previews from R2 presigned URLs
  "media-src 'self' blob: https://*.r2.cloudflarestorage.com",
  // PDF iframe previews from R2
  "frame-src 'self' blob: https://www.google.com https://*.r2.cloudflarestorage.com",
  // No plugins or embeds
  "object-src 'none'",
  // Prevent base tag hijacking
  "base-uri 'self'",
  // Restrict form submissions to same origin
  "form-action 'self'",
  // Only allow HTTPS for all embedded content
  "upgrade-insecure-requests",
].join('; ')

const securityHeaders = [
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Prevent clickjacking
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Control referrer leakage
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disable unnecessary browser APIs
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=()',
  },
  // Force HTTPS for 2 years, include subdomains, preload-eligible
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Content Security Policy
  { key: 'Content-Security-Policy', value: CSP },
  // Prevent cross-origin information leaks via DNS prefetch
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
]

const nextConfig = {
  // Disable strict mode to avoid double-invoking useEffect with PeerJS events.
  reactStrictMode: false,
  output: 'standalone',
  poweredByHeader: false,
  // Compress responses (gzip/brotli) — handled by nginx in production,
  // but this covers direct Node.js scenarios.
  compress: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: require('./package.json').version,
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    NEXT_PUBLIC_COMMIT_SHA: gitSha(),
  },
  // Optimise images from Supabase avatar bucket and trusted CDNs
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
    ],
    // 1-week browser cache, 1-day CDN cache for optimised images
    minimumCacheTTL: 86400,
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Cache static JS/CSS assets aggressively (content-hashed filenames)
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // No-cache for API routes
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
    ]
  },
  async redirects() {
    return [
      // Legacy slug format compatibility (if any)
    ]
  },
}

module.exports = nextConfig
