import { ItemCategory, OcrLineStatus, ReceiptStatus, StorageLocation } from "@prisma/client";

export type OcrExtractedLine = {
  rawLine?: string;
  extractedName: string;
  extractedQuantity?: number;
  extractedUnit?: string;
  extractedPrice?: number;
  confidence?: number;
};

export type ReceiptItem = {
  name: string;
  quantity: number;
  unit: string;
  price: number | null;
};

export type ReceiptOcrOutput = {
  rawText: string;
  retailer: string;
  purchaseDate: string | null;
  items: ReceiptItem[];
  confidence: number | null;
  lines: Array<OcrExtractedLine & { lineStatus: OcrLineStatus }>;
  provider: "gemini" | "ocr_space" | "tesseract" | "mock";
};

type ReceiptOcrProvider = "gemini" | "ocr_space" | "tesseract" | "mock";

type ReceiptRetailer = string;

const RECEIPT_LINE_BLACKLIST = [
  /subtotal/i,
  /total/i,
  /tax/i,
  /visa|mastercard|debit|credit/i,
  /change due/i,
  /member/i,
  /thank/i,
  /cashier/i,
  /store/i,
  /items sold/i,
  /balance/i
];

const UNIT_HINTS = ["lb", "lbs", "kg", "g", "oz", "ct", "pk", "ea", "pcs", "pc", "gal", "l"];

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MOCK_RAW_TEXT = [
  "EGGS LARGE 1 CT 4.99",
  "WHOLE MILK 1 GAL 4.49",
  "BANANAS 2 LB 1.98"
].join("\n");

type GeminiReceiptItem = {
  name?: unknown;
  quantity?: unknown;
  unit?: unknown;
  price?: unknown;
};

type GeminiReceiptPayload = {
  merchantName?: unknown;
  purchaseDate?: unknown;
  items?: unknown;
};

export async function enqueueReceiptProcessing(_receiptUploadId: string) {
  void _receiptUploadId;

  return { status: ReceiptStatus.PROCESSING };
}

export function mapRawLinesToOcrResults(lines: OcrExtractedLine[]) {
  return lines.map((line) => ({
    ...line,
    lineStatus: OcrLineStatus.EXTRACTED
  }));
}

export function detectRetailer(rawText: string): ReceiptRetailer {
  const normalized = rawText.toLowerCase();

  if (normalized.includes("costco")) {
    return "costco";
  }

  if (normalized.includes("walmart")) {
    return "walmart";
  }

  if (normalized.includes("safeway")) {
    return "safeway";
  }

  return "unknown";
}

function normalizeBase64(imageBase64: string) {
  const trimmed = imageBase64.trim();
  if (!trimmed) {
    return "";
  }

  if (!trimmed.includes(",")) {
    return trimmed;
  }

  return trimmed.split(",")[1] ?? "";
}

function normalizeBase64Image(imageBase64: string) {
  const trimmed = imageBase64.trim();
  if (!trimmed) {
    return { base64: "", mimeType: "image/jpeg" };
  }

  if (!trimmed.includes(",")) {
    return { base64: trimmed, mimeType: "image/jpeg" };
  }

  const [prefix, encoded] = trimmed.split(",", 2);
  const mimeTypeMatch = prefix?.match(/^data:([^;]+);base64$/i);

  return {
    base64: encoded ?? "",
    mimeType: mimeTypeMatch?.[1] ?? "image/jpeg"
  };
}

function toConfidenceFraction(rawConfidence: number | null | undefined) {
  if (typeof rawConfidence !== "number" || !Number.isFinite(rawConfidence)) {
    return null;
  }

  const normalized = rawConfidence > 1 ? rawConfidence / 100 : rawConfidence;
  return Math.max(0, Math.min(1, Math.round(normalized * 100) / 100));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function cleanName(name: string) {
  return name
    .replace(/[\*#]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function parsePrice(line: string) {
  const match = line.match(/(?:\$\s*)?(\d{1,4}[.,]\d{2})\s*$/);

  if (!match) {
    return null;
  }

  const numeric = Number(match[1].replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

function parseQuantityAndUnit(line: string) {
  const quantityWithUnit = line.match(/\b(\d{1,3}(?:[.,]\d+)?)\s*(lb|lbs|kg|g|oz|ct|pk|ea|pcs|pc|gal|l)\b/i);
  if (quantityWithUnit) {
    const quantity = Number(quantityWithUnit[1].replace(",", "."));
    return {
      quantity: Number.isFinite(quantity) ? quantity : 1,
      unit: quantityWithUnit[2].toLowerCase()
    };
  }

  const multiplier = line.match(/\b(\d{1,3})\s*[xX]\b/);
  if (multiplier) {
    const quantity = Number(multiplier[1]);
    if (Number.isFinite(quantity)) {
      return { quantity, unit: "pcs" };
    }
  }

  return { quantity: 1, unit: "item" };
}

function parseName(line: string, retailer: ReceiptRetailer, extractedPrice: number | null) {
  let next = line;

  if (extractedPrice != null) {
    next = next.replace(/(?:\$\s*)?\d{1,4}[.,]\d{2}\s*$/, "");
  }

  next = next.replace(/\b\d+\s*[xX]\b/g, " ");
  next = next.replace(/\b\d{1,3}(?:[.,]\d+)?\s*(lb|lbs|kg|g|oz|ct|pk|ea|pcs|pc|gal|l)\b/gi, " ");

  if (retailer === "walmart") {
    next = next.replace(/\s+[ATX]$/i, "");
  }

  if (retailer === "costco") {
    next = next.replace(/^\d{4,}\s+/, "");
  }

  if (retailer === "safeway") {
    next = next.replace(/\bclub\b/gi, " ");
  }

  return cleanName(next);
}

function shouldSkipLine(line: string) {
  if (!line || line.length < 3) {
    return true;
  }

  if (/^\d+$/.test(line)) {
    return true;
  }

  return RECEIPT_LINE_BLACKLIST.some((pattern) => pattern.test(line));
}

export function parseReceiptLines(rawText: string, retailer: ReceiptRetailer): OcrExtractedLine[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => !shouldSkipLine(line));

  const parsed: OcrExtractedLine[] = [];

  for (const line of lines) {
    const price = parsePrice(line);
    const parsedQuantity = parseQuantityAndUnit(line);
    const name = parseName(line, retailer, price);

    if (!name || name.length < 2) {
      continue;
    }

    if (!/[A-Za-z]/.test(name)) {
      continue;
    }

    if (!UNIT_HINTS.includes(parsedQuantity.unit) && parsedQuantity.unit !== "item") {
      parsedQuantity.unit = "item";
    }

    parsed.push({
      rawLine: line,
      extractedName: name,
      extractedQuantity: parsedQuantity.quantity,
      extractedUnit: parsedQuantity.unit,
      extractedPrice: price ?? undefined
    });
  }

  return parsed.slice(0, 80);
}

function parseTimeoutMs() {
  const configured = Number(process.env.RECEIPT_OCR_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  if (!Number.isFinite(configured)) {
    return DEFAULT_TIMEOUT_MS;
  }

  return Math.max(3_000, Math.min(60_000, Math.trunc(configured)));
}

function sanitizeJsonText(rawContent: string) {
  const trimmed = rawContent.trim();
  if (!trimmed) {
    return "";
  }

  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  return trimmed;
}

function toNumericOrNull(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toTextOrNull(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function toReceiptItems(items: GeminiReceiptItem[]) {
  const parsed: ReceiptItem[] = [];

  for (const item of items) {
    const name = typeof item.name === "string" ? cleanName(item.name) : "";
    if (!name || name.length < 2 || !/[A-Za-z]/.test(name)) {
      continue;
    }

    const quantity = toNumericOrNull(item.quantity);
    const unit = typeof item.unit === "string" && item.unit.trim() ? item.unit.trim().toLowerCase() : "item";
    const price = toNumericOrNull(item.price);

    parsed.push({
      name,
      quantity: quantity && quantity > 0 ? quantity : 1,
      unit,
      price
    });
  }

  return parsed.slice(0, 80);
}

function toGeminiVisionLines(items: ReceiptItem[]) {
  const lines: OcrExtractedLine[] = [];

  for (const item of items) {
    lines.push({
      rawLine: [
        item.name,
        item.quantity !== 1 ? String(item.quantity) : null,
        item.unit && item.unit !== "item" ? item.unit : null,
        item.price != null ? item.price.toFixed(2) : null
      ]
        .filter((part): part is string => Boolean(part))
        .join(" "),
      extractedName: item.name,
      extractedQuantity: item.quantity,
      extractedUnit: UNIT_HINTS.includes(item.unit) ? item.unit : "item",
      extractedPrice: item.price ?? undefined,
      confidence: undefined
    });
  }

  return lines.slice(0, 80);
}

function parseGeminiVisionJson(rawContent: string) {
  const jsonText = sanitizeJsonText(rawContent);
  if (!jsonText) {
    throw new Error("Gemini Vision returned an empty response");
  }

  let parsed: GeminiReceiptPayload;
  try {
    parsed = JSON.parse(jsonText) as GeminiReceiptPayload;
  } catch {
    throw new Error("Gemini Vision returned invalid JSON");
  }

  const merchantName = toTextOrNull(parsed.merchantName) ?? "unknown";
  const purchaseDate = toTextOrNull(parsed.purchaseDate);
  const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
  const items = rawItems.filter((item): item is GeminiReceiptItem => Boolean(item && typeof item === "object"));
  const parsedItems = toReceiptItems(items);
  const lines = toGeminiVisionLines(parsedItems);

  return {
    merchantName,
    purchaseDate,
    items: parsedItems,
    lines,
    rawText: JSON.stringify(
      {
        merchantName,
        purchaseDate,
        items: parsedItems
      },
      null,
      2
    )
  };
}

function resolveOcrProvider(): ReceiptOcrProvider {
  const configured = process.env.RECEIPT_OCR_PROVIDER?.toLowerCase().trim();
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const hasOcrSpace = Boolean(process.env.OCR_SPACE_API_KEY);
  const isProduction = process.env.NODE_ENV === "production";

  if (configured) {
    if (configured === "gemini" || configured === "ocr_space" || configured === "tesseract" || configured === "mock") {
      if (configured === "mock" && isProduction) {
        throw new Error("RECEIPT_OCR_PROVIDER=mock is not allowed in production. Configure GEMINI_API_KEY or OCR_SPACE_API_KEY.");
      }

      if (configured === "gemini" && !hasGemini) {
        throw new Error("RECEIPT_OCR_PROVIDER=gemini requires GEMINI_API_KEY.");
      }

      return configured;
    }

    throw new Error(
      `Unsupported RECEIPT_OCR_PROVIDER value: ${configured}. Supported values: gemini, ocr_space, tesseract, mock.`
    );
  }

  if (hasGemini) {
    return "gemini";
  }

  if (hasOcrSpace) {
    return "ocr_space";
  }

  if (!isProduction) {
    return "tesseract";
  }

  throw new Error(
    "No real OCR provider is configured. Set GEMINI_API_KEY or OCR_SPACE_API_KEY, or set RECEIPT_OCR_PROVIDER to gemini, ocr_space, or tesseract."
  );
}

async function runGeminiVisionOcr(imageBase64: string): Promise<ReceiptOcrOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  const normalizedImage = normalizeBase64Image(imageBase64);
  const normalizedBase64 = normalizedImage.base64;
  if (!normalizedBase64) {
    throw new Error("Receipt image is empty");
  }

  const prompt = [
    "Extract this receipt and return ONLY valid JSON.",
    "Schema:",
    "{",
    '  "merchantName": "",',
    '  "purchaseDate": null,',
    '  "items": [',
    "    {",
    '      "name": "",',
    '      "quantity": 1,',
    '      "unit": "",',
    '      "price": null',
    "    }",
    "  ]",
    "}",
    "Rules:",
    "- Return JSON only, no markdown.",
    "- Include only actual purchased line items.",
    "- Exclude totals, tax, discounts, headers, and payment lines.",
    "- If quantity is missing, use 1.",
    "- If unit is missing, use 'item'.",
    "- If price is missing, use null.",
    "- Keep merchantName empty string when unknown.",
    "- Use an ISO-like date string for purchaseDate when available, otherwise null."
  ].join("\n");

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json"
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt
            },
            {
              inlineData: {
                mimeType: normalizedImage.mimeType,
                data: normalizedBase64
              }
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Gemini Vision HTTP ${response.status}${body ? `: ${body}` : ""}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
      finishReason?: string;
    }>;
    promptFeedback?: {
      blockReason?: string;
      blockReasonMessage?: string;
    };
  };

  const candidate = payload.candidates?.[0];
  if (!candidate) {
    const blockedMessage = payload.promptFeedback?.blockReasonMessage;
    throw new Error(blockedMessage || "Gemini Vision returned no candidates");
  }

  if (candidate.finishReason && candidate.finishReason !== "STOP") {
    throw new Error(`Gemini Vision stopped with finish reason: ${candidate.finishReason}`);
  }

  const content = candidate.content?.parts?.map((part) => part.text ?? "").join("\n") ?? "";

  const parsed = parseGeminiVisionJson(content);
  const lines = mapRawLinesToOcrResults(parsed.lines);

  return {
    rawText: parsed.rawText,
    retailer: parsed.merchantName,
    purchaseDate: parsed.purchaseDate,
    items: parsed.items,
    confidence: null,
    lines,
    provider: "gemini"
  };
}

async function runOcrSpaceOcr(imageBase64: string): Promise<ReceiptOcrOutput> {
  const apiKey = process.env.OCR_SPACE_API_KEY;
  if (!apiKey) {
    throw new Error("OCR_SPACE_API_KEY is missing");
  }

  const formData = new FormData();
  formData.set("base64Image", `data:image/jpeg;base64,${normalizeBase64(imageBase64)}`);
  formData.set("language", "eng");
  formData.set("isOverlayRequired", "false");
  formData.set("isTable", "false");
  formData.set("OCREngine", "2");

  const response = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: {
      apikey: apiKey
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(`OCR.Space HTTP ${response.status}`);
  }

  const payload = (await response.json()) as {
    IsErroredOnProcessing?: boolean;
    ErrorMessage?: string | string[];
    ParsedResults?: Array<{ ParsedText?: string; TextOverlay?: { HasOverlay?: boolean } }>;
  };

  if (payload.IsErroredOnProcessing) {
    const message = Array.isArray(payload.ErrorMessage) ? payload.ErrorMessage.join("; ") : payload.ErrorMessage;
    throw new Error(message || "OCR.Space processing failed");
  }

  const rawText = payload.ParsedResults?.[0]?.ParsedText?.trim() ?? "";
  if (!rawText) {
    throw new Error("OCR.Space returned empty text");
  }

  const retailer = detectRetailer(rawText);
  const parsedLines = parseReceiptLines(rawText, retailer).map((line) => ({
    ...line,
    confidence: 0.8
  }));

  return {
    rawText,
    retailer,
    purchaseDate: null,
    items: parsedLines.map((line) => ({
      name: line.extractedName,
      quantity: line.extractedQuantity ?? 1,
      unit: line.extractedUnit ?? "item",
      price: line.extractedPrice ?? null
    })),
    confidence: 0.8,
    lines: mapRawLinesToOcrResults(parsedLines),
    provider: "ocr_space"
  };
}

async function runTesseractOcr(imageBase64: string): Promise<ReceiptOcrOutput> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");

  try {
    const imageBuffer = Buffer.from(normalizeBase64(imageBase64), "base64");
    const {
      data: { text, confidence }
    } = await worker.recognize(imageBuffer);

    const rawText = text.trim();
    if (!rawText) {
      throw new Error("Tesseract returned empty text");
    }

    const retailer = detectRetailer(rawText);
    const normalizedConfidence = toConfidenceFraction(confidence);
    const parsedLines = parseReceiptLines(rawText, retailer).map((line) => ({
      ...line,
      confidence: normalizedConfidence ?? undefined
    }));

    return {
      rawText,
      retailer,
      purchaseDate: null,
      items: parsedLines.map((line) => ({
        name: line.extractedName,
        quantity: line.extractedQuantity ?? 1,
        unit: line.extractedUnit ?? "item",
        price: line.extractedPrice ?? null
      })),
      confidence: normalizedConfidence,
      lines: mapRawLinesToOcrResults(parsedLines),
      provider: "tesseract"
    };
  } finally {
    await worker.terminate();
  }
}

export function buildMockReceiptOcrResult() {
  const rawText = DEFAULT_MOCK_RAW_TEXT;
  const retailer = detectRetailer(rawText);
  const parsedLines = parseReceiptLines(rawText, retailer).map((line) => ({
    ...line,
    confidence: 0.65
  }));

  return {
    rawText,
    retailer,
    purchaseDate: null,
    items: parsedLines.map((line) => ({
      name: line.extractedName,
      quantity: line.extractedQuantity ?? 1,
      unit: line.extractedUnit ?? "item",
      price: line.extractedPrice ?? null
    })),
    confidence: 0.65,
    lines: mapRawLinesToOcrResults(parsedLines),
    provider: "mock" as const
  };
}

export async function runReceiptOcrFromBase64(imageBase64: string): Promise<ReceiptOcrOutput> {
  const timeoutMs = parseTimeoutMs();
  const provider = resolveOcrProvider();

  if (provider === "gemini") {
    return withTimeout(runGeminiVisionOcr(imageBase64), timeoutMs, "Gemini Vision OCR");
  }

  if (provider === "mock") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Mock OCR is not allowed in production. Configure a real OCR provider.");
    }

    return buildMockReceiptOcrResult();
  }

  if (provider === "ocr_space") {
    return withTimeout(runOcrSpaceOcr(imageBase64), timeoutMs, "OCR.Space");
  }

  return withTimeout(runTesseractOcr(imageBase64), timeoutMs, "Tesseract OCR");
}

export function inferReceiptItemDetails(name: string) {
  const normalized = name.toLowerCase();

  if (normalized.includes("egg")) {
    return { category: ItemCategory.EGGS, storageLocation: StorageLocation.REFRIGERATOR };
  }

  if (normalized.includes("milk") || normalized.includes("yogurt")) {
    return { category: ItemCategory.DAIRY, storageLocation: StorageLocation.REFRIGERATOR };
  }

  if (normalized.includes("spinach") || normalized.includes("broccoli") || normalized.includes("vegetable")) {
    return { category: ItemCategory.VEGETABLES, storageLocation: StorageLocation.REFRIGERATOR };
  }

  if (normalized.includes("salmon")) {
    return { category: ItemCategory.SEAFOOD, storageLocation: StorageLocation.FREEZER };
  }

  return { category: ItemCategory.OTHER, storageLocation: StorageLocation.PANTRY };
}
