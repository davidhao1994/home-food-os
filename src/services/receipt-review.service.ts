import { ItemCategory, StorageLocation } from "@prisma/client";
import { inferReceiptItemDetails } from "@/services/ocr.service";
import { getSuggestedExpirationDate, normalizeFoodName } from "@/utils/food";

type OcrLineInput = {
  id: string;
  rawLine: string | null;
  extractedName: string;
  extractedQuantity: number | null;
  extractedUnit: string | null;
  extractedPrice: number | null;
  confidence: number | null;
  lineStatus: string;
};

type InventoryCandidateInput = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: ItemCategory;
  storageLocation: StorageLocation;
  expirationDate: Date | null;
};

function normalizeUnit(unit: string | null | undefined) {
  return unit?.trim().toLowerCase() ?? "";
}

function canDefaultMerge(lineUnit: string | null, inventoryUnit: string) {
  const left = normalizeUnit(lineUnit);
  const right = normalizeUnit(inventoryUnit);

  if (!left || !right) {
    return true;
  }

  if (left === right) {
    return true;
  }

  return ["item", "items", "pc", "pcs"].includes(left) || ["item", "items", "pc", "pcs"].includes(right);
}

export function buildReceiptReviewLines(lines: OcrLineInput[], inventoryItems: InventoryCandidateInput[]) {
  const inventoryByName = new Map<string, InventoryCandidateInput[]>();

  for (const item of inventoryItems) {
    const key = normalizeFoodName(item.name);
    const current = inventoryByName.get(key) ?? [];
    current.push(item);
    inventoryByName.set(key, current);
  }

  return lines.map((line) => {
    const details = inferReceiptItemDetails(line.extractedName);
    const duplicateCandidates = (inventoryByName.get(normalizeFoodName(line.extractedName)) ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      storageLocation: item.storageLocation,
      expirationDate: item.expirationDate?.toISOString() ?? null
    }));
    const defaultMergeTarget = duplicateCandidates.find((candidate) => canDefaultMerge(line.extractedUnit, candidate.unit)) ?? null;

    return {
      ...line,
      suggestedCategory: details.category,
      suggestedStorageLocation: details.storageLocation,
      suggestedExpirationDate: getSuggestedExpirationDate(details.category, new Date())?.toISOString() ?? null,
      duplicateCandidates,
      defaultAction: defaultMergeTarget ? "MERGE" : "CREATE_NEW",
      defaultMergeTargetId: defaultMergeTarget?.id ?? null
    };
  });
}