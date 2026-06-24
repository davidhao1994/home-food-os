# Home Food OS

Production-oriented SaaS-ready household food platform built with Next.js 15, TypeScript, Tailwind, shadcn-style UI primitives, Supabase Auth, Supabase Postgres, Prisma ORM, TanStack Query, Zustand, and PWA support.

## Stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- Supabase Authentication
- Supabase PostgreSQL
- Prisma ORM
- TanStack Query
- Zustand
- Recharts
- Vercel deployment target

## Project Structure

```text
home-food-os/
  prisma/
    migrations/
    schema.prisma
    seed.ts
  src/
    app/
    components/
    features/
    hooks/
    lib/
    prisma/
    services/
    store/
    types/
    utils/
  docs/
```

## Quick Start

1. Install Node.js 20+ and npm.
2. Copy environment template:
   - `cp .env.example .env.local`
3. Install dependencies:
   - `npm install`
4. Generate Prisma client:
   - `npm run prisma:generate`
5. Run migrations:
   - `npm run prisma:migrate`
6. Seed demo data:
   - `npm run prisma:seed`
7. Start dev server:
   - `npm run dev`

## Auth Setup (Supabase)

- Create a Supabase project.
- Enable Email/Password provider.
- Enable Google provider and set callback URL:
  - `http://localhost:3000/auth/callback`
- Fill environment values in `.env.local`.

Detailed guide: `docs/SUPABASE_SETUP.md`

## Development Guides

- Local development: `docs/LOCAL_DEVELOPMENT.md`
- Deployment: `docs/VERCEL_DEPLOYMENT.md`
- Architecture phases: `docs/PHASES.md`

## Notes

- Receipt scanner now uses a reliable upload-process-status flow with timeout-safe OCR states.
- OCR provider selection supports Gemini Vision (`GEMINI_API_KEY`) and OCR.Space (`OCR_SPACE_API_KEY`) via `RECEIPT_OCR_PROVIDER`.
- If `RECEIPT_OCR_PROVIDER` is not set and `GEMINI_API_KEY` is present, Gemini Vision is selected by default.
- Production never defaults to mock OCR. If no real OCR provider is configured, receipt processing fails with a clear configuration error.
- AI assistant uses mock responses and a prompt template layer.
- Family sharing schema is included (`households`, `household_members`) for future expansion.
