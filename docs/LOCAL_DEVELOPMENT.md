# Local Development Guide

## Requirements

- Node.js 20+
- npm 10+
- Supabase project

## Setup

1. `cp .env.example .env.local`
2. Fill all Supabase and database environment variables.
3. `npm install`
4. `npm run prisma:generate`
5. `npm run prisma:migrate`
6. `npm run prisma:seed`
7. `npm run dev`

## Useful Commands

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run prisma:generate`

## Troubleshooting

- Auth redirect issues: verify Google callback URL includes `/auth/callback`.
- Prisma connection issues: verify `DIRECT_URL` uses direct Postgres port.
- Missing tables: run migration and seed steps again.
