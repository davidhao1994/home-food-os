import { ItemCategory } from "@prisma/client";

type FoodNutritionProfile = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
};

type FoodRecord = {
  canonical: string;
  aliases: string[];
  per100g: FoodNutritionProfile;
  source: "USDA_MAPPED" | "CATEGORY_FALLBACK";
};

const FOOD_DB: FoodRecord[] = [
  { canonical: "egg", aliases: ["eggs"], per100g: { calories: 143, protein: 12.6, fat: 9.5, carbs: 0.7, fiber: 0 }, source: "USDA_MAPPED" },
  { canonical: "milk", aliases: ["whole milk"], per100g: { calories: 61, protein: 3.2, fat: 3.3, carbs: 4.8, fiber: 0 }, source: "USDA_MAPPED" },
  { canonical: "chicken breast", aliases: ["chicken"], per100g: { calories: 165, protein: 31, fat: 3.6, carbs: 0, fiber: 0 }, source: "USDA_MAPPED" },
  { canonical: "salmon", aliases: [], per100g: { calories: 208, protein: 20, fat: 13, carbs: 0, fiber: 0 }, source: "USDA_MAPPED" },
  { canonical: "spinach", aliases: [], per100g: { calories: 23, protein: 2.9, fat: 0.4, carbs: 3.6, fiber: 2.2 }, source: "USDA_MAPPED" },
  { canonical: "broccoli", aliases: [], per100g: { calories: 34, protein: 2.8, fat: 0.4, carbs: 6.6, fiber: 2.6 }, source: "USDA_MAPPED" },
  { canonical: "rice", aliases: ["white rice"], per100g: { calories: 130, protein: 2.4, fat: 0.3, carbs: 28, fiber: 0.4 }, source: "USDA_MAPPED" },
  { canonical: "greek yogurt", aliases: ["yogurt"], per100g: { calories: 59, protein: 10, fat: 0.4, carbs: 3.6, fiber: 0 }, source: "USDA_MAPPED" },
  { canonical: "tofu", aliases: [], per100g: { calories: 76, protein: 8, fat: 4.8, carbs: 1.9, fiber: 0.3 }, source: "USDA_MAPPED" },
  { canonical: "chickpeas", aliases: ["garbanzo"], per100g: { calories: 164, protein: 8.9, fat: 2.6, carbs: 27.4, fiber: 7.6 }, source: "USDA_MAPPED" }
];

const CATEGORY_FALLBACK: Record<ItemCategory, FoodNutritionProfile> = {
  MEAT: { calories: 220, protein: 24, fat: 14, carbs: 0, fiber: 0 },
  SEAFOOD: { calories: 160, protein: 22, fat: 7, carbs: 0, fiber: 0 },
  VEGETABLES: { calories: 40, protein: 2, fat: 0.5, carbs: 8, fiber: 2.5 },
  FRUITS: { calories: 60, protein: 1, fat: 0.3, carbs: 15, fiber: 2 },
  DAIRY: { calories: 90, protein: 6, fat: 4.5, carbs: 5, fiber: 0 },
  EGGS: { calories: 143, protein: 12.6, fat: 9.5, carbs: 0.7, fiber: 0 },
  GRAINS: { calories: 180, protein: 4, fat: 1.2, carbs: 37, fiber: 2 },
  FROZEN_FOODS: { calories: 150, protein: 6, fat: 6, carbs: 18, fiber: 2 },
  CONDIMENTS: { calories: 80, protein: 1, fat: 2, carbs: 12, fiber: 0.5 },
  SNACKS: { calories: 240, protein: 4, fat: 12, carbs: 28, fiber: 2 },
  BEVERAGES: { calories: 45, protein: 0.5, fat: 0.2, carbs: 11, fiber: 0 },
  OTHER: { calories: 120, protein: 4, fat: 4, carbs: 16, fiber: 1.5 }
};

function toGrams(quantity: number, unit: string) {
  const normalized = unit.toLowerCase().trim();

  if (["g", "gram", "grams"].includes(normalized)) {
    return quantity;
  }

  if (["kg", "kilogram", "kilograms"].includes(normalized)) {
    return quantity * 1000;
  }

  if (["lb", "lbs", "pound", "pounds"].includes(normalized)) {
    return quantity * 453.592;
  }

  if (["oz", "ounce", "ounces"].includes(normalized)) {
    return quantity * 28.3495;
  }

  if (["l", "liter", "liters"].includes(normalized)) {
    return quantity * 1000;
  }

  if (["ml"].includes(normalized)) {
    return quantity;
  }

  if (["pcs", "pc", "item", "items", "ct", "ea"].includes(normalized)) {
    return quantity * 50;
  }

  if (["cup", "cups"].includes(normalized)) {
    return quantity * 240;
  }

  return quantity * 100;
}

function lookupByName(name: string) {
  const normalized = name.toLowerCase().trim();

  return FOOD_DB.find((item) =>
    normalized.includes(item.canonical) || item.aliases.some((alias) => normalized.includes(alias))
  );
}

export function estimateItemNutrition(name: string, category: ItemCategory, quantity: number, unit: string) {
  const grams = toGrams(Math.max(quantity, 0), unit || "item");
  const match = lookupByName(name);
  const profile = match?.per100g ?? CATEGORY_FALLBACK[category];
  const factor = grams / 100;

  return {
    calories: profile.calories * factor,
    protein: profile.protein * factor,
    fat: profile.fat * factor,
    carbs: profile.carbs * factor,
    fiber: profile.fiber * factor,
    source: match?.source ?? "CATEGORY_FALLBACK"
  };
}
