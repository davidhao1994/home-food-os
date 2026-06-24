import { InventoryItem, Recipe, RecipeIngredient } from "@prisma/client";
import { RecipeRecommendation } from "@/types/domain";
import { getExpirationBucket, isExpiringSoonBucket, normalizeFoodName } from "@/utils/food";

type RecipeWithIngredients = Recipe & { ingredients: RecipeIngredient[] };

type RecommendationOptions = {
  cuisine?: string;
  maxCookTime?: number;
  proteinTarget?: number;
};

export function buildRecipeRecommendations(
  inventory: InventoryItem[],
  recipes: RecipeWithIngredients[],
  options: RecommendationOptions = {}
): RecipeRecommendation[] {
  const inventoryByName = new Map<string, InventoryItem[]>();

  for (const item of inventory) {
    const key = normalizeFoodName(item.name);
    const current = inventoryByName.get(key) ?? [];
    current.push(item);
    inventoryByName.set(key, current);
  }

  return recipes
    .filter((recipe) => (options.cuisine ? recipe.cuisine.toLowerCase() === options.cuisine.toLowerCase() : true))
    .filter((recipe) => (options.maxCookTime != null ? recipe.cookTime <= options.maxCookTime : true))
    .filter((recipe) => (options.proteinTarget != null ? Number(recipe.protein ?? 0) >= options.proteinTarget : true))
    .map((recipe) => {
      const required = recipe.ingredients.filter((ingredient) => !ingredient.isOptional);
      const matched = required.filter((ingredient) => inventoryByName.has(normalizeFoodName(ingredient.name)));
      const missingDetailed = required.filter((ingredient) => !inventoryByName.has(normalizeFoodName(ingredient.name)));
      const missing = missingDetailed.map((ingredient) => ingredient.name);

      const score = required.length === 0 ? 100 : Math.round((matched.length / required.length) * 100);
      const matchedNames = matched.map((ingredient) => ingredient.name);
      const expiringMatches = matchedNames.filter((ingredientName) => {
        const candidates = inventoryByName.get(normalizeFoodName(ingredientName)) ?? [];
        return candidates.some((item) => isExpiringSoonBucket(getExpirationBucket(item.expirationDate)));
      });

      const reasonParts: string[] = [];
      if (matchedNames.length > 0) {
        reasonParts.push(`Uses ${matchedNames.slice(0, 3).join(", ")}${matchedNames.length > 3 ? ` +${matchedNames.length - 3} more` : ""} you already have`);
      }
      if (expiringMatches.length > 0) {
        reasonParts.push(`helps use ${expiringMatches.slice(0, 2).join(", ")} before it sits too long`);
      }
      if (missing.length === 0) {
        reasonParts.push("needs no extra shopping");
      } else if (missing.length === 1) {
        reasonParts.push(`only needs ${missing[0]} to finish`);
      } else {
        reasonParts.push(`only needs ${missing.length} more ingredients`);
      }
      reasonParts.push(`${recipe.cookTime} min cook time`);

      return {
        recipeId: recipe.id,
        name: recipe.name,
        matchScore: score,
        ingredientMatchPercent: score,
        missingIngredients: missing,
        missingIngredientsDetailed: missingDetailed.map((ingredient) => ({
          name: ingredient.name,
          quantity: ingredient.quantity ? Number(ingredient.quantity) : null,
          unit: ingredient.unit ?? null,
          category: ingredient.category ?? null
        })),
        matchedIngredients: matchedNames,
        reason: `${reasonParts.join(". ")}.`,
        estimatedCalories: recipe.calories,
        estimatedProtein: recipe.protein ? Number(recipe.protein) : null,
        estimatedFat: recipe.fat ? Number(recipe.fat) : null,
        estimatedCarbs: recipe.carbs ? Number(recipe.carbs) : null,
        cookingTime: recipe.cookTime,
        cuisine: recipe.cuisine
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore || a.missingIngredients.length - b.missingIngredients.length || a.name.localeCompare(b.name));
}
