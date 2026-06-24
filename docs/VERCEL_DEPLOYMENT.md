# Vercel Deployment Guide

## 1. Push Repository

Push `home-food-os` to GitHub.

## 2. Import Project in Vercel

- Framework preset: Next.js
- Root directory: `home-food-os`

## 3. Environment Variables

Set all variables from `.env.example` in Vercel project settings.

## 4. Build Configuration

Default Next.js build command is sufficient:

- Build command: `next build`
- Output: `.next`

## 5. Deploy

Trigger deployment from main branch.

## 6. Post-deploy

- Update Supabase auth redirect URLs with production domain.
- Verify PWA install prompt on mobile.
