import { ItemCategory, OcrLineStatus, ReceiptStatus, StorageLocation } from "@prisma/client";
import { createWorker } from "tesseract.js";

export type OcrExtractedLine = {
  rawLine?: string;
  extractedName: string;
  extractedQuantity?: number;
  extractedUnit?: string;
  extractedPrice?: number;
  confidence?: number;
};

type ReceiptRetailer = "costco" | "walmart" | "safeway" | "unknown";

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

export async function runReceiptOcrFromBase64(imageBase64: string) {
  const worker = await createWorker("eng");

  try {
    const imageBuffer = Buffer.from(imageBase64, "base64");
    const {
      data: { text, confidence }
    } = await worker.recognize(imageBuffer);

    const rawText = text.trim();
    const retailer = detectRetailer(rawText);
    const parsedLines = parseReceiptLines(rawText, retailer).map((line) => ({
      ...line,
      confidence: Math.round(confidence) / 100
    }));

    return {
      rawText,
      retailer,
      confidence: Math.round(confidence) / 100,
      lines: mapRawLinesToOcrResults(parsedLines)
    };
  } finally {
    await worker.terminate();
  }
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
