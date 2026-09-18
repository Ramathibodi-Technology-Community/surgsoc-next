# SurgSoc Web

Next.js + Payload CMS application for Ramathibodi Surgical Society.

## Local Development

0. Use Node.js 22 (`.nvmrc` is provided):
   - `nvm use` (or install Node 22 manually)
1. Use `pnpm` 10 (project package manager: `pnpm@10.17.1`):
   - `corepack enable`
   - `corepack prepare pnpm@10.17.1 --activate`

2. Install dependencies:
   - `pnpm install`
3. Configure environment variables:
   - Copy `.env.example` to `.env` and fill required values.
4. Start database:
   - `make db-up`
   - or `pnpm run db:up`
5. Run migrations/seed (if needed):
   - `pnpm run db:migrate`
   - `pnpm run db:seed`
   - optional one-shot bootstrap: `pnpm run db:fresh`
6. Start dev server:
   - `make dev`
   - or `pnpm run dev`

## Production Readiness Gates

Run before every deployment:

- `pnpm run check` (lint + typecheck)
- `pnpm run build` (Next production build)

or all together:

- `pnpm run vercel-build`

Recommended for local confidence as well:

- `pnpm run test` (Vitest)

## Vercel Deployment

This repository includes `vercel.json` configured to:

- install with `pnpm install --frozen-lockfile`
- build with `pnpm run vercel-build`

### Required Vercel Environment Variables

- `PAYLOAD_SECRET`
- `DATABASE_URL`
- `NEXT_PUBLIC_SERVER_URL` (your production URL)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `GOOGLE_CALLBACK_URL` (optional; if omitted, uses `${NEXT_PUBLIC_SERVER_URL}/api/auth/google/callback`)

## Notes

- Apple touch icon and favicon are generated via app metadata routes.
- In production, notification email links require `NEXT_PUBLIC_SERVER_URL`.
- Docker database service name is `payload-db` (used by `make db-up` / `pnpm run db:up`).

## Data Import Guide

- See `docs/data-import-how-to.md` for step-by-step admin import instructions, per-type schemas, and CSV examples.
