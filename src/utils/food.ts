import { ItemCategory, StorageLocation } from "@prisma/client";
import { addDays, differenceInCalendarDays, isBefore, startOfDay } from "date-fns";

export type ExpirationBucket = "expired" | "today" | "threeDays" | "sevenDays" | "safe";

const CATEGORY_DEFAULTS: Record<
  ItemCategory,
  {
    storageLocation: StorageLocation;
    expirationDays: number | null;
  }
> = {
  MEAT: { storageLocation: StorageLocation.REFRIGERATOR, expirationDays: 2 },
  SEAFOOD: { storageLocation: StorageLocation.REFRIGERATOR, expirationDays: 1 },
  VEGETABLES: { storageLocation: StorageLocation.REFRIGERATOR, expirationDays: 5 },
  FRUITS: { storageLocation: StorageLocation.COUNTERTOP, expirationDays: 7 },
  DAIRY: { storageLocation: StorageLocation.REFRIGERATOR, expirationDays: 7 },
  EGGS: { storageLocation: StorageLocation.REFRIGERATOR, expirationDays: 21 },
  GRAINS: { storageLocation: StorageLocation.PANTRY, expirationDays: 180 },
  FROZEN_FOODS: { storageLocation: StorageLocation.FREEZER, expirationDays: 90 },
  CONDIMENTS: { storageLocation: StorageLocation.PANTRY, expirationDays: 120 },
  SNACKS: { storageLocation: StorageLocation.PANTRY, expirationDays: 60 },
  BEVERAGES: { storageLocation: StorageLocation.REFRIGERATOR, expirationDays: 30 },
  OTHER: { storageLocation: StorageLocation.PANTRY, expirationDays: 14 }
};

export function normalizeFoodName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function formatCategoryLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getFoodCategoryDefaults(category: ItemCategory) {
  return CATEGORY_DEFAULTS[category] ?? CATEGORY_DEFAULTS.OTHER;
}

export function getDefaultStorageLocation(category: ItemCategory) {
  return getFoodCategoryDefaults(category).storageLocation;
}

export function getSuggestedExpirationDate(category: ItemCategory, purchaseDate?: Date | null) {
  const { expirationDays } = getFoodCategoryDefaults(category);

  if (expirationDays == null) {
    return null;
  }

  return addDays(startOfDay(purchaseDate ?? new Date()), expirationDays);
}

export function getExpirationBucket(expirationDate?: Date | null): ExpirationBucket {
  if (!expirationDate) {
    return "safe";
  }

  const today = startOfDay(new Date());
  const target = startOfDay(expirationDate);

  if (isBefore(target, today)) {
    return "expired";
  }

  const diff = differenceInCalendarDays(target, today);

  if (diff === 0) {
    return "today";
  }

  if (diff <= 3) {
    return "threeDays";
  }

  if (diff <= 7) {
    return "sevenDays";
  }

  return "safe";
}

export function isExpiringSoonBucket(bucket: ExpirationBucket) {
  return bucket === "expired" || bucket === "today" || bucket === "threeDays" || bucket === "sevenDays";
}

export function getExpirationLabel(bucket: ExpirationBucket) {
  if (bucket === "expired") {
    return "Expired";
  }

  if (bucket === "today") {
    return "Expires today";
  }

  if (bucket === "threeDays") {
    return "Expires in 3 days";
  }

  if (bucket === "sevenDays") {
    return "Expires in 7 days";
  }

  return "Fresh";
}
