# API Runtime Evidence (2026-06-23)

Environment:
- Base URL: http://localhost:3010
- Authenticated user: audit.user.1782261102625@example.com

## Inventory CRUD (After Fix)
- POST /api/inventory: 201
- PATCH /api/inventory: 200
- DELETE /api/inventory?id=5dcffa75-34f4-4c11-914f-ebe44fadbb12: 200
- GET /api/inventory: 200

Observed response fragments:
- POST body included created item with fields: id, brand, barcode, lowStockThreshold.
- PATCH body included updated item name and quantity.
- DELETE body: {"ok":true}

## Dashboard Dependencies (After Fix)
- GET /dashboard: 200 (page render with calculated cards)
- No Prisma P2022 for inventory_items.brand in runtime log after migration fix.

## Recipe Recommendation (After Fix)
- GET /api/recipes/recommendations: 200
- Response body includes recommendations array (recipeId/name/matchScore/etc.).

## Nutrition Dashboard (After Fix)
- GET /nutrition: 200 (page render)

## Receipt OCR (After Fix)
- POST /api/receipts/upload: 200
- POST /api/receipts/confirm: 200
- Runtime flow displayed extracted OCR lines and confirmation success message.

## PWA Checks (Re-Verification)
- GET /manifest.webmanifest: 200
- Manifest link present in page: /manifest.webmanifest
- Service worker registrations: ["http://localhost:3010/service-worker.js"]
- display-mode standalone in test session: false

## Google Login (Re-Verification)
- OAuth redirect URL reached Supabase authorize endpoint with provider=google.
- Response body: {"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}
