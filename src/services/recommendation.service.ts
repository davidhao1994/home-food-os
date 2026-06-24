import { InventoryItem, Recipe, RecipeIngredient } from "@prisma/client";
import { RecipeRecommendation } from "@/types/domain";

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
  const inventoryNames = new Set(inventory.map((item) => item.name.toLowerCase().trim()));

  return recipes
    .filter((recipe) => (options.cuisine ? recipe.cuisine.toLowerCase() === options.cuisine.toLowerCase() : true))
    .filter((recipe) => (options.maxCookTime != null ? recipe.cookTime <= options.maxCookTime : true))
    .filter((recipe) => (options.proteinTarget != null ? Number(recipe.protein ?? 0) >= options.proteinTarget : true))
    .map((recipe) => {
      const required = recipe.ingredients.filter((ingredient) => !ingredient.isOptional);
      const matched = required.filter((ingredient) => inventoryNames.has(ingredient.name.toLowerCase().trim()));
      const missing = required
        .filter((ingredient) => !inventoryNames.has(ingredient.name.toLowerCase().trim()))
        .map((ingredient) => ingredient.name);

      const score = required.length === 0 ? 100 : Math.round((matched.length / required.length) * 100);

      return {
        recipeId: recipe.id,
        name: recipe.name,
        matchScore: score,
        ingredientMatchPercent: score,
        missingIngredients: missing,
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
