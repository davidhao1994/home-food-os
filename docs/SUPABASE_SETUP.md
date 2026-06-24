# Supabase Setup Guide

## 1. Create Supabase Project

- Create a new project in Supabase.
- Copy project URL and API keys.

## 2. Configure Auth

- Enable Email provider.
- Enable Google provider.
- Set Redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `https://your-vercel-domain/auth/callback`

## 3. Configure Database Connection

Use Supabase pooled connection for `DATABASE_URL` and direct connection for `DIRECT_URL`.

Example:

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## 4. Run Prisma Migration

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

## 5. Row Level Security (Recommended)

Create policies in Supabase for each user-owned table keyed by `auth.uid() = userId`.
