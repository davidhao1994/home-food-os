# Project Audit - Home Food OS

Date: 2026-06-23
Scope: Full repository audit before any fixes.

## 1) Folder Structure Analysis

Current high-level structure is coherent for a Next.js App Router project:

- prisma: Schema, migration, and seed scripts are present.
- src/app: App Router route groups for auth and dashboard; API route handlers under app/api.
- src/components: Layout, shared, and UI primitives.
- src/features: Domain-oriented client features (inventory, shopping, recipes, nutrition, receipts, AI, auth).
- src/lib/services/utils/store/types: Separation of concerns is generally good.
- docs: Setup and deployment guides exist.

Observed strengths:

- Clear route grouping and API layering.
- Prisma models cover user, inventory, shopping, recipes, OCR, and AI conversations.
- Basic PWA assets exist (manifest + service worker + icons).

## 2) Findings (Severity, Location, Root Cause, Recommended Fix)

### Critical

1. Script mismatch blocks requested validation workflow
- Severity: Critical
- Location: package.json
- Root cause: Script is named typecheck, but required workflow calls npm run type-check.
- Recommended fix: Add a type-check script alias that runs tsc --noEmit to match CI/operator commands.

2. API handlers accept unvalidated JSON payloads
- Severity: Critical
- Location: src/app/api/inventory/route.ts, src/app/api/shopping/route.ts, src/app/api/receipts/upload/route.ts, src/app/api/ai/chat/route.ts
- Root cause: request.json() is used directly without runtime schema validation.
- Recommended fix: Add Zod schemas for request bodies/params, return typed 400 errors for invalid input, and sanitize numeric/date fields.

3. Auth/session middleware layer is missing
- Severity: Critical
- Location: repository root (missing middleware.ts)
- Root cause: No request middleware to keep Supabase auth session refreshed for App Router navigation and route transitions.
- Recommended fix: Add Supabase-compatible middleware for cookie/session refresh and explicit matcher configuration.

### Major

4. Next 15 + Supabase server cookie handling is fragile
- Severity: Major
- Location: src/lib/supabase-server.ts
- Root cause: Cookie mutation is attempted through setAll in contexts where cookie writes can be restricted (Server Components), which may cause runtime auth instability.
- Recommended fix: Follow current Supabase SSR pattern with guarded cookie writes and route/middleware split for mutation-safe contexts.

5. Navigation omits an implemented route
- Severity: Major
- Location: src/components/layout/app-shell.tsx
- Root cause: /nutrition page exists but is not in side navigation links.
- Recommended fix: Add nutrition nav link and icon so implemented route is discoverable.

6. React package and type package versions are misaligned
- Severity: Major
- Location: package.json
- Root cause: react/react-dom are on RC versions while @types/react and @types/react-dom are 18.x.
- Recommended fix: Align to stable compatible versions for Next 15 target (or remove unnecessary mismatched types once React 19 compatibility is confirmed).

7. Prisma household owner is not relationally enforced
- Severity: Major
- Location: prisma/schema.prisma (model Household)
- Root cause: ownerId is scalar-only and lacks @relation to Profile.
- Recommended fix: Add explicit relation and FK/index to enforce owner integrity and simplify ownership queries.

8. Profile bootstrap may overwrite email unintentionally
- Severity: Major
- Location: src/services/profile.service.ts
- Root cause: ensureProfile always updates email to derived fallback when email is absent.
- Recommended fix: Only update email when a non-null source email is available; avoid replacing existing non-null profile email with synthetic fallback.

9. API authorization model is coarse and lacks policy boundary checks
- Severity: Major
- Location: app/api routes, prisma access layer
- Root cause: requireUser gate exists, but no per-operation ownership schema validation beyond where filters; no formal policy layer.
- Recommended fix: Add typed guards and centralized policy helpers for ownership checks and resource access decisions.

### Minor

10. Inconsistent command documentation vs scripts
- Severity: Minor
- Location: docs/LOCAL_DEVELOPMENT.md, package.json
- Root cause: docs refer to typecheck, requested operational flow uses type-check.
- Recommended fix: support both scripts or standardize docs and scripts to one canonical name with alias.

11. Missing explicit error/loading/empty-state standards in multiple views
- Severity: Minor
- Location: src/features/* client views
- Root cause: many optimistic fetch flows only return early on failure; no standardized error surface.
- Recommended fix: Add shared UX states and error boundary strategy.

12. PWA registration is unconditional for all environments
- Severity: Minor
- Location: src/components/shared/pwa-register.tsx
- Root cause: service worker registration has no environment gating/version strategy.
- Recommended fix: Gate registration to production and add update/versioning strategy.

13. Receipt and AI flows are intentionally mocked but not marked as production-disabled
- Severity: Minor
- Location: src/features/receipts/*, src/features/ai/*, src/services/ai.service.ts, src/services/ocr.service.ts
- Root cause: mock architecture exists without runtime feature flags.
- Recommended fix: Add feature flags and explicit production behavior notes/messages.

## 3) Missing Files / Missing Dependencies / Invalid Imports / Circular Dependencies

Missing files:
- middleware.ts at project root (required for robust Supabase SSR auth/session behavior).

Missing dependencies:
- No hard missing runtime dependencies were found from static import inspection.
- Potential compatibility dependency concern: React RC with 18.x type packages.

Invalid imports:
- No unresolved alias/file imports were found in static inspection.

Circular dependencies:
- No obvious circular dependency pattern was found in static inspection.
- A formal graph check tool should be run during remediation (for example madge) to confirm.

## 4) TypeScript Issues (Pre-validation expectation)

- Script naming mismatch likely breaks required command sequence (type-check).
- Version misalignment may produce type noise or instability during strict checks.
- API body typing is not enforced at runtime (compile-time types do not protect runtime payloads).

## 5) Prisma Issues (Pre-validation expectation)

- Household.ownerId has no FK relation to Profile.
- Migrate dev may require a reachable Postgres/Supabase instance and env configuration before succeeding.

## 6) API Issues (Pre-validation expectation)

- No Zod request validation.
- Inconsistent error payload structure across endpoints.
- Partial data coercion without strict parsing guarantees.

## 7) Authentication Issues (Pre-validation expectation)

- Missing middleware session refresh path.
- Callback route always redirects to /dashboard and does not expose failure context.
- No visible guard UX for auth callback errors.

## 8) UI Issues (Pre-validation expectation)

- Nutrition route is implemented but absent in navigation.
- Error/empty/loading states are inconsistent across pages.

## 9) Build Issues (Pre-validation expectation)

- Required command npm run type-check currently fails due to missing script alias.
- Additional build/lint/type issues to be confirmed in Phase 1 command execution.

## 10) Prioritized Remediation Plan

Priority 0 (Blockers)
1. Add type-check script alias and align command surface with CI/docs.
2. Run install/lint/type/build and capture exact errors in BUILD_REPORT.md.
3. Resolve all TypeScript/ESLint/build failures until npm run build passes cleanly.

Priority 1 (Security/Auth/Data Integrity)
4. Add middleware.ts for Supabase auth/session handling.
5. Harden supabase-server cookie handling for Next 15-safe contexts.
6. Introduce Zod validation for all API route inputs and normalize error response contracts.
7. Add missing Prisma relation for Household.ownerId and validate migrations.

Priority 2 (Stability/UX/Operations)
8. Add missing /nutrition nav item.
9. Standardize loading/error/empty states and add route-level error boundaries.
10. Gate mocked AI/OCR behavior via feature flags for production clarity.

Priority 3 (Quality and Scalability)
11. Verify route and API behavior end-to-end with auth enabled.
12. Review indexes/query shapes and document scalability constraints in DATABASE_REPORT.md.
13. Final production-hardening pass and final release report with verified status matrix.
