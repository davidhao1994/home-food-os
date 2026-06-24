export const ITEM_CATEGORIES = [
  "MEAT",
  "SEAFOOD",
  "VEGETABLES",
  "FRUITS",
  "DAIRY",
  "EGGS",
  "GRAINS",
  "FROZEN_FOODS",
  "CONDIMENTS",
  "SNACKS",
  "BEVERAGES",
  "OTHER"
] as const;

export const STORAGE_LOCATIONS = ["REFRIGERATOR", "FREEZER", "PANTRY", "COUNTERTOP"] as const;

export const SHOPPING_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];
export type StorageLocation = (typeof STORAGE_LOCATIONS)[number];
export type ShoppingPriority = (typeof SHOPPING_PRIORITIES)[number];

export type RecipeMissingIngredient = {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: ItemCategory | null;
};

export type RecipeRecommendation = {
  recipeId: string;
  name: string;
  matchScore: number;
  ingredientMatchPercent: number;
  missingIngredients: string[];
  missingIngredientsDetailed: RecipeMissingIngredient[];
  matchedIngredients: string[];
  reason: string;
  estimatedCalories: number | null;
  estimatedProtein: number | null;
  estimatedFat: number | null;
  estimatedCarbs: number | null;
  cookingTime: number;
  cuisine?: string;
};
