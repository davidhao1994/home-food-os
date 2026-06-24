# Production Environment Template

Use these values in Vercel Project Settings -> Environment Variables.

```env
# Supabase Postgres (Prisma)
DATABASE_URL="postgresql://postgres:[PASSWORD]@[PROJECT-REF].pooler.[REGION].supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:[PASSWORD]@[PROJECT-REF].[REGION].supabase.com:5432/postgres"

# Supabase Auth / Client
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# App URL
NEXT_PUBLIC_APP_URL="https://your-vercel-domain.vercel.app"

# Feature Flags
# false for normal production auth, true only for Family Demo deployment
NEXT_PUBLIC_FAMILY_DEMO_MODE="false"
```

## Notes

- Use pooled connection in `DATABASE_URL` and direct connection in `DIRECT_URL`.
- Do not reuse local values from `.env` in production.
- Set the same values for Production (and Preview if needed) in Vercel.
