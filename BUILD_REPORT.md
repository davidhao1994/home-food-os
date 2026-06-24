# Build Report - Home Food OS

Date: 2026-06-23
Environment: macOS arm64

## Commands Executed (Initial Pass)

1) npm install

Exact error:

```text
npm error code ERESOLVE
npm error ERESOLVE unable to resolve dependency tree
npm error While resolving: home-food-os@0.1.0
npm error Found: react@19.0.0-rc-69d4b800-20241021
npm error Could not resolve dependency:
npm error peer react@"^18 || ^19" from @tanstack/react-query@5.101.1
```

Affected files:

- package.json

Root cause:

- React is pinned to an RC pre-release version that does not satisfy peer dependency semver ranges expecting stable major versions.

Fix strategy:

- Align react/react-dom to stable versions compatible with Next 15 and project dependencies.

---

2) npm run lint

Exact error:

```text
> home-food-os@0.1.0 lint
> next lint

sh: next: command not found
```

Affected files:

- package.json

Root cause:

- Dependency installation failed in step 1; local next binary was not installed.

Fix strategy:

- Resolve install dependency conflict first, then rerun lint.

---

3) npm run type-check

Exact error:

```text
npm error Missing script: "type-check"
npm error Did you mean this?
npm error   npm run typecheck
```

Affected files:

- package.json

Root cause:

- Script alias type-check is missing.

Fix strategy:

- Add type-check script mapped to tsc --noEmit.

---

4) npx tsc --noEmit

Exact error:

```text
npm error npx canceled due to missing packages and no YES option: ["tsc@2.0.4"]
```

Affected files:

- package.json (indirectly)

Root cause:

- TypeScript dependency is not installed due to failed npm install.

Fix strategy:

- Fix dependency resolution, install packages, then run compiler checks.

---

5) npm run build

Exact error:

```text
> home-food-os@0.1.0 build
> next build

sh: next: command not found
```

Affected files:

- package.json

Root cause:

- Next.js package unavailable because install failed.

Fix strategy:

- Resolve dependency tree conflict and reinstall.

## Summary of Initial Build State

- Build status: Failed
- Primary blocker: Dependency resolution conflict around React RC version.
- Secondary blockers: Missing type-check script alias and missing installed binaries resulting from failed install.

## Remediation Applied

1. Added package script alias:
- type-check -> tsc --noEmit

2. Resolved dependency conflicts:
- Aligned react/react-dom to stable 18.2-compatible range for next@15.0.0.
- Restored @types/react and @types/react-dom to matching 18.x line.

3. TypeScript and lint fixes:
- Removed invalid ignoreDeprecations value from tsconfig.json.
- Fixed unused argument lint issue in OCR service placeholder.
- Updated Supabase server client for Next 15 async cookies API.
- Added strict type annotations for cookie callback payloads.
- Typed App Router links to satisfy typedRoutes constraints.

## Commands Executed (Post-fix Pass)

1) npm install
- Result: Success

2) npm run lint
- Result: Success (no warnings/errors)

3) npm run type-check
- Result: Success

4) npx tsc --noEmit
- Result: Success

5) npm run build
- Result: Success

Final status:
- Build status: Passed
- TypeScript status: Passed
- ESLint status: Passed
