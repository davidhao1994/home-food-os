# Supabase Report - Home Food OS

Date: 2026-06-23

## Authentication Components Reviewed

- Server auth utilities: src/lib/auth.ts, src/lib/supabase-server.ts
- Browser auth client: src/lib/supabase-browser.ts
- Middleware: middleware.ts (added)
- Callback route: src/app/auth/callback/route.ts (hardened)
- Login/Signup pages and forms: src/app/(auth)/*, src/features/auth/*
- Protected route strategy: src/app/(dashboard)/layout.tsx + requireUser

## Required Environment Variables

Confirmed in .env.example:
- DATABASE_URL
- DIRECT_URL
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_APP_URL

Operational note:
- .env was created locally from .env.example for CLI validation in this environment.

## Setup Instructions

1. Copy template:
- cp .env.example .env.local

2. Configure Supabase values in .env.local:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

3. Configure DB URLs for Prisma:
- DATABASE_URL (pooled)
- DIRECT_URL (direct)

4. Supabase Auth provider setup:
- Enable Email/Password
- Enable Google OAuth
- Add redirect URLs:
  - http://localhost:3000/auth/callback
  - https://<your-domain>/auth/callback

5. Run Prisma commands:
- npm run prisma:generate
- npm run prisma:migrate
- npm run prisma:seed

## Authentication Flow Diagram

```mermaid
flowchart TD
  A[User opens app] --> B{Has session?}
  B -- No --> C[/login or /signup]
  B -- Yes --> D[/dashboard]

  C --> E[Supabase Email Login or Signup]
  C --> F[Supabase Google OAuth]
  F --> G[/auth/callback?code=...]
  G --> H[exchangeCodeForSession]
  H --> I{Success?}
  I -- Yes --> D
  I -- No --> C2[/login?error=oauth_exchange_failed]

  D --> J[requireUser in server components]
  J --> K[Protected pages and API routes]

  M[middleware.ts] --> N[refresh session cookies]
  N --> B
```

## Validation Status

What was verified:
- Build/type/lint integrity of auth code paths: PASS
- Callback missing-code guard path: PASS (redirects to /login?error=missing_code)
- Protected routes unauthenticated behavior: PASS (redirect to /login)
- Protected API unauthenticated behavior: PASS (redirect to /login)

What could not be fully verified in this environment:
- Real email signup/login roundtrip with Supabase project credentials
- Real Google OAuth callback exchange against live provider
- Session lifecycle across browser refresh with live Supabase tokens

## Fixes Applied

1. Added middleware.ts for Supabase session refresh behavior.
2. Updated supabase server client for Next 15 async cookies API.
3. Hardened callback route with explicit missing-code and exchange-failure redirects.
