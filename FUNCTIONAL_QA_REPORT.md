# Functional QA Report

## Scope
Authenticated Home Food OS QA and product-hardening pass focused on post-login usability.

## Feature Results
- Inventory management: PASS
  - Tested add, edit, delete, search, category filter, storage-location filter, expiration sort, and refresh persistence.
  - Verified realistic items including Eggs, Milk, Chicken breast, Tofu, Broccoli, and Rice.
- Shopping list: PASS
  - Tested add, edit, delete, mark purchased, purchase-and-move-to-inventory, and refresh persistence.
  - Verified realistic items including Bananas, Greek yogurt, Salmon, and Frozen vegetables.
- Dashboard counts: PASS
  - Verified inventory count, shopping count, expiring-soon count, recommended-recipe count, and nutrition summary values update from live data.
- Expiration tracking: PASS
  - Verified expired, expires today, within 3 days, within 7 days, and safe future states in the UI and dashboard count logic.
- Recipe recommendation: PASS
  - Verified exact matches, partial matches, missing-ingredient display, match percentages, and descending match-score sorting.
- Nutrition dashboard: PASS
  - Verified chart rendering, calorie/protein totals, and safe empty-state handling in code path.
- Receipt scanner placeholder workflow: PASS
  - Verified image upload through the file input, mock extraction, review list, and add-selected-items-to-inventory.
- AI assistant mock workflow: PASS
  - Verified inventory-aware responses for cooking suggestions, expiring items, high-protein shopping, and Chinese dish recommendations.
- Mobile layout usability: PASS
  - Verified at 390 x 844 that primary pages avoid horizontal overflow and retain usable navigation, forms, and action buttons.
- Data persistence after refresh: PASS
  - Verified inventory and shopping state persisted after page refreshes.

## Bugs Found And Fixed
- Inventory lacked update support, purchase-date handling, storage-location filtering, and usable edit controls.
- Inventory date-only inputs shifted by one day because the API parsed `YYYY-MM-DD` as UTC.
- Shopping edit requests were incorrectly interpreted as purchase actions because the PATCH schema defaulted `action`.
- Dashboard recipe count used raw recipe rows instead of inventory-based recommendations.
- Dashboard nutrition summary was placeholder text instead of real totals.
- Expiration logic did not distinguish `expires today` from broader `within 3 days` states.
- Recipe recommendations depended on existing DB seed data and could show nothing useful on a fresh account.
- AI assistant mock ignored live inventory and returned generic filler text.
- Receipt placeholder stopped at extraction and could not move reviewed items into inventory.
- Nutrition charts had weak empty-state handling.
- Mobile nav and action layout were cramped on narrow screens.

## Files Changed
- src/app/api/ai/chat/route.ts
- src/app/api/inventory/route.ts
- src/app/api/receipts/confirm/route.ts
- src/app/api/recipes/recommendations/route.ts
- src/app/api/shopping/route.ts
- src/app/(dashboard)/dashboard/page.tsx
- src/app/(dashboard)/nutrition/page.tsx
- src/app/(dashboard)/recipes/page.tsx
- src/components/layout/app-shell.tsx
- src/features/ai/assistant-chat.tsx
- src/features/inventory/inventory-view.tsx
- src/features/nutrition/nutrition-charts.tsx
- src/features/receipts/receipt-uploader.tsx
- src/features/shopping/shopping-view.tsx
- src/services/ai.service.ts
- src/services/ocr.service.ts
- src/services/recipe-catalog.service.ts
- src/services/recommendation.service.ts
- src/types/domain.ts
- src/utils/food.ts

## Validation Commands
- `npm run lint`: PASS
- `npm run type-check`: PASS
- `npm run build`: PASS
- `npx prisma validate`: PASS
- `npx prisma generate`: PASS

## Remaining Limitations
- Receipt import is still mock-only; uploaded file contents are not parsed yet.
- Receipt-confirmed items can create duplicates because there is no merge or dedupe policy yet.
- Nutrition totals are category-based estimates, not item-specific nutrition facts from a food database.
- AI assistant responses are rule-based mock outputs, not real LLM-backed reasoning.
- Repeated QA actions can intentionally inflate dashboard counts because inventory currently allows duplicate items.
