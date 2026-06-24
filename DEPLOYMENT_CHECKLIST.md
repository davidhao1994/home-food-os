# Deployment Checklist (Vercel + Supabase + Prisma)

This checklist is focused on production readiness only.

## 1) Required Environment Variables

Set all variables from [PRODUCTION_ENV_TEMPLATE.md](PRODUCTION_ENV_TEMPLATE.md):

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_FAMILY_DEMO_MODE`

Verification:

- `NEXT_PUBLIC_APP_URL` must be your deployed HTTPS domain.
- `NEXT_PUBLIC_FAMILY_DEMO_MODE` must be `false` for normal production.
- `DATABASE_URL` must use Supabase pooler (`:6543` + `pgbouncer=true`).
- `DIRECT_URL` must use direct Postgres (`:5432`).

## 2) Supabase Settings

Auth:

- Enable providers required by product (Email and any social providers used).
- Add site URL: your production app domain.
- Add redirect URL: `https://<your-domain>/auth/callback`.

Database:

- Confirm Prisma migrations are tracked and ready to deploy.
- Ensure database user has privileges for migration + app runtime operations.

Security:

- Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only.
- Confirm RLS policies are enabled for user-owned tables.

## 3) Vercel Settings

Project:

- Framework Preset: Next.js
- Root Directory: `home-food-os` (if monorepo)
- Node.js: 20.x

Environment Variables:

- Add all required variables to Production.
- Mirror to Preview only if preview environment needs full backend integration.

Build & Runtime:

- Build Command: `next build` (default)
- Install Command: `npm install` (default)
- Output: `.next` (default)

## 4) Validation Gates Before Deploy

Run in project root:

```bash
npm run lint
npm run type-check
npm run build
npx prisma validate
npx prisma generate
```

Expected result: all commands pass with no errors.

## 5) Prisma + Supabase Production Readiness

Before first production cutover:

1. Run migration deploy against production DB:
   - `npx prisma migrate deploy`
2. Regenerate Prisma client in CI/build if needed:
   - `npx prisma generate`
3. Verify runtime connectivity via deployed app health path or first authenticated page load.

If baseline/migration history mismatch exists on existing DB, resolve migration state before deploy (for example via `prisma migrate resolve`) and re-run `prisma migrate deploy`.

## 6) Family Demo Mode Production Verification

`NEXT_PUBLIC_FAMILY_DEMO_MODE=true` behavior:

- Login/signup pages redirect to dashboard.
- Auth bypass uses fixed demo identity.
- Household setup is auto-created/upserted.

`NEXT_PUBLIC_FAMILY_DEMO_MODE=false` behavior:

- Standard Supabase auth flow is required.
- Sign out is enabled.

Recommendation: keep `false` in main production unless deploying a dedicated demo environment.

## 7) No Localhost URLs / No Hardcoded Dev Ports

Verify all production-facing values are HTTPS domain based:

- No `localhost` in Vercel environment variables.
- No hardcoded `:3000`, `:3005`, `:3010` in runtime configuration.
- Localhost references may exist in local-development docs, but not in production env values.

## 8) Deployment Steps

1. Push release commit to main branch.
2. Confirm Vercel Production env variables are set.
3. Trigger Vercel production deployment.
4. Run `npx prisma migrate deploy` against production database.
5. Smoke test critical paths:
   - auth callback
   - dashboard load
   - inventory API
   - shopping API
   - nutrition page
6. Confirm no server errors in Vercel logs.

## 9) Rollback Steps

Application rollback:

1. In Vercel, redeploy the last known good production deployment.
2. Re-verify smoke tests.

Database rollback:

1. Prefer forward-fix migration for production safety.
2. If emergency rollback is required, restore from Supabase backup/PITR snapshot.
3. Repoint app only after DB state and app version are compatible.

Feature-flag rollback:

1. Toggle `NEXT_PUBLIC_FAMILY_DEMO_MODE` to `false` if demo mode causes issues.
2. Redeploy to apply the updated environment value.
