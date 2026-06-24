import { ItemCategory, PrismaClient } from "@prisma/client";
import { BUILT_IN_RECIPE_LIBRARY } from "@/services/recipe-library";

function toRecipeUuid(index: number) {
  return `10000000-0000-0000-0000-${String(index + 1).padStart(12, "0")}`;
}

function toIngredientUuid(index: number) {
  return `20000000-0000-0000-0000-${String(index + 1).padStart(12, "0")}`;
}

function inferIngredientCategory(name: string): ItemCategory {
  const value = ` ${name.toLowerCase()} `;

  if (/ chicken | beef | pork | turkey /.test(value)) {
    return ItemCategory.MEAT;
  }
  if (/ salmon | shrimp | tuna | fish /.test(value)) {
    return ItemCategory.SEAFOOD;
  }
  if (/ tomato | broccoli | lettuce | spinach | pepper | onion | mushroom | bok choy | carrot | cucumber | greens | cabbage /.test(value)) {
    return ItemCategory.VEGETABLES;
  }
  if (/ yogurt | milk | cheese /.test(value)) {
    return ItemCategory.DAIRY;
  }
  if (/ egg /.test(value)) {
    return ItemCategory.EGGS;
  }
  if (/ rice | noodle | pasta | bread | tortilla /.test(value)) {
    return ItemCategory.GRAINS;
  }
  if (/ chips | crackers | seeds /.test(value)) {
    return ItemCategory.SNACKS;
  }
  if (/ sauce | oil | vinegar | miso | curry /.test(value)) {
    return ItemCategory.CONDIMENTS;
  }

  return ItemCategory.OTHER;
}

const defaultRecipes = BUILT_IN_RECIPE_LIBRARY.map((recipe, recipeIndex) => {
  const recipeId = toRecipeUuid(recipeIndex);
  const ingredients = [...recipe.ingredients.map((name) => ({ name, isOptional: false })), ...recipe.optionalIngredients.map((name) => ({ name, isOptional: true }))];

  return {
    id: recipeId,
    name: recipe.titleEn,
    description: `${recipe.titleZh} · ${recipe.tags.join(", ")}`,
    cuisine: recipe.cuisine,
    cookTime: recipe.cookTime,
    difficulty: recipe.difficulty,
    calories: recipe.estimatedNutrition?.calories ?? null,
    protein: recipe.estimatedNutrition?.protein ?? null,
    carbs: recipe.estimatedNutrition?.carbs ?? null,
    fat: recipe.estimatedNutrition?.fat ?? null,
    ingredients: ingredients.map((ingredient, ingredientIndex) => ({
      id: toIngredientUuid(recipeIndex * 20 + ingredientIndex),
      name: ingredient.name,
      quantity: 1,
      unit: "item",
      category: inferIngredientCategory(ingredient.name),
      isOptional: ingredient.isOptional
    }))
  };
});

export async function ensureBaseRecipes(prisma: PrismaClient) {
  await prisma.recipe.createMany({
    data: defaultRecipes.map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      cuisine: recipe.cuisine,
      cookTime: recipe.cookTime,
      difficulty: recipe.difficulty,
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat
    })),
    skipDuplicates: true
  });

  await prisma.recipeIngredient.createMany({
    data: defaultRecipes.flatMap((recipe) =>
      recipe.ingredients.map((ingredient) => ({
        id: ingredient.id,
        recipeId: recipe.id,
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        category: ingredient.category,
        isOptional: "isOptional" in ingredient ? ingredient.isOptional : false
      }))
    ),
    skipDuplicates: true
  });

  return prisma.recipe.findMany({
    include: { ingredients: true },
    orderBy: { name: "asc" }
  });
}