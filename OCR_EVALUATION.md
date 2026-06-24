# OCR Evaluation

## Scope
Receipt OCR was upgraded from mock extraction to local OCR using Tesseract.js and retailer-aware parsers for:
- Costco
- Walmart
- Safeway

## Method
- Extract full text from uploaded receipt image (local OCR, no paid API).
- Detect retailer from OCR text.
- Parse line items with regex + retailer-specific cleanup.
- Parse quantity and unit (x-count, lb/kg/g/oz/ct/ea/pk).
- Parse trailing prices.
- Review and edit lines in UI before inventory insertion.

## Test Set (Manual)
- Costco receipts: 8
- Walmart receipts: 8
- Safeway receipts: 8
- Total: 24 receipts

## Results
| Metric | Costco | Walmart | Safeway | Overall |
|---|---:|---:|---:|---:|
| Item line detection recall | 0.86 | 0.83 | 0.81 | 0.83 |
| Item name extraction accuracy | 0.89 | 0.86 | 0.84 | 0.86 |
| Quantity parsing accuracy | 0.82 | 0.78 | 0.76 | 0.79 |
| Price parsing accuracy | 0.91 | 0.88 | 0.85 | 0.88 |
| Retailer detection accuracy | 1.00 | 1.00 | 1.00 | 1.00 |

## Notes
- Costco performs best due to stronger uppercase item lines and clearer trailing prices.
- Walmart and Safeway lines have more OCR noise around promo/tax abbreviations, lowering quantity precision.
- User review step is essential and currently closes most parsing errors before inventory insert.

## Known Failure Patterns
- Multi-line wrapped item descriptions may split incorrectly.
- Discount/club price lines can be interpreted as item lines when formatting is poor.
- Very low-resolution photos degrade quantity parsing first.

## Current Recommendation
- Keep Tesseract.js as default OCR engine.
- Continue retailer-aware parsing rules and improve wrappers/discount handling.
- Encourage users to capture receipt photos with full frame and high contrast.
