# Recipe Tab Navigation Regression Check

Purpose: Ensure bottom navigation remains clickable after opening the Recipes tab.

## Manual verification

1. Open mobile viewport (iPhone width) and sign in.
2. Tap Recipes from bottom nav.
3. Tap each tab from Recipes page:
   - Dashboard
   - Inventory
   - Scan
   - Shopping
   - Nutrition
4. Confirm each tap navigates immediately with no stuck state.
5. Return to Recipes and repeat quickly 3-5 times.
6. Confirm no invisible overlay blocks nav after opening dialogs/sheets.

## Layering guardrails implemented

- Bottom nav uses fixed high z-index layer (`z-[140]`).
- Main content is isolated (`isolate`) and kept below nav.
- Mobile bottom padding reserves tap-safe nav area.
