import { ItemCategory, PrismaClient, RecipeDifficulty } from "@prisma/client";

const defaultRecipes = [
  {
    id: "10000000-0000-0000-0000-000000000001",
    name: "Egg Fried Rice",
    description: "Fast fried rice using staple pantry ingredients.",
    cuisine: "Chinese",
    cookTime: 20,
    difficulty: RecipeDifficulty.EASY,
    calories: 460,
    protein: 18,
    carbs: 58,
    fat: 16,
    ingredients: [
      { id: "20000000-0000-0000-0000-000000000001", name: "Eggs", quantity: 2, unit: "pcs", category: ItemCategory.EGGS },
      { id: "20000000-0000-0000-0000-000000000002", name: "Rice", quantity: 2, unit: "cups", category: ItemCategory.GRAINS },
      { id: "20000000-0000-0000-0000-000000000003", name: "Broccoli", quantity: 1, unit: "head", category: ItemCategory.VEGETABLES, isOptional: true }
    ]
  },
  {
    id: "10000000-0000-0000-0000-000000000002",
    name: "Chicken Broccoli Stir-Fry",
    description: "A high-protein stir-fry with simple Chinese flavors.",
    cuisine: "Chinese",
    cookTime: 25,
    difficulty: RecipeDifficulty.EASY,
    calories: 520,
    protein: 42,
    carbs: 22,
    fat: 20,
    ingredients: [
      { id: "20000000-0000-0000-0000-000000000004", name: "Chicken breast", quantity: 400, unit: "g", category: ItemCategory.MEAT },
      { id: "20000000-0000-0000-0000-000000000005", name: "Broccoli", quantity: 2, unit: "heads", category: ItemCategory.VEGETABLES },
      { id: "20000000-0000-0000-0000-000000000006", name: "Rice", quantity: 1, unit: "cup", category: ItemCategory.GRAINS, isOptional: true }
    ]
  },
  {
    id: "10000000-0000-0000-0000-000000000003",
    name: "Miso Tofu Rice Bowl",
    description: "Simple Japanese-style tofu bowl with greens and rice.",
    cuisine: "Japanese",
    cookTime: 18,
    difficulty: RecipeDifficulty.EASY,
    calories: 430,
    protein: 24,
    carbs: 48,
    fat: 14,
    ingredients: [
      { id: "20000000-0000-0000-0000-000000000007", name: "Tofu", quantity: 1, unit: "block", category: ItemCategory.OTHER },
      { id: "20000000-0000-0000-0000-000000000008", name: "Rice", quantity: 1, unit: "cup", category: ItemCategory.GRAINS },
      { id: "20000000-0000-0000-0000-000000000009", name: "Broccoli", quantity: 1, unit: "head", category: ItemCategory.VEGETABLES }
    ]
  },
  {
    id: "10000000-0000-0000-0000-000000000004",
    name: "Korean Salmon Bowl",
    description: "Protein-forward Korean-inspired salmon bowl.",
    cuisine: "Korean",
    cookTime: 22,
    difficulty: RecipeDifficulty.MEDIUM,
    calories: 560,
    protein: 39,
    carbs: 24,
    fat: 28,
    ingredients: [
      { id: "20000000-0000-0000-0000-000000000010", name: "Salmon", quantity: 300, unit: "g", category: ItemCategory.SEAFOOD },
      { id: "20000000-0000-0000-0000-000000000011", name: "Greek yogurt", quantity: 1, unit: "cup", category: ItemCategory.DAIRY },
      { id: "20000000-0000-0000-0000-000000000012", name: "Rice", quantity: 1, unit: "cup", category: ItemCategory.GRAINS }
    ]
  },
  {
    id: "10000000-0000-0000-0000-000000000005",
    name: "Milk Egg Scramble",
    description: "Soft eggs boosted with milk for an American-style breakfast.",
    cuisine: "American",
    cookTime: 10,
    difficulty: RecipeDifficulty.EASY,
    calories: 280,
    protein: 17,
    carbs: 8,
    fat: 18,
    ingredients: [
      { id: "20000000-0000-0000-0000-000000000013", name: "Eggs", quantity: 3, unit: "pcs", category: ItemCategory.EGGS },
      { id: "20000000-0000-0000-0000-000000000014", name: "Milk", quantity: 1, unit: "cup", category: ItemCategory.DAIRY }
    ]
  },
  {
    id: "10000000-0000-0000-0000-000000000006",
    name: "Mediterranean Chickpea Bowl",
    description: "Mediterranean bowl with chickpeas, yogurt, and vegetables.",
    cuisine: "Mediterranean",
    cookTime: 18,
    difficulty: RecipeDifficulty.EASY,
    calories: 490,
    protein: 21,
    carbs: 54,
    fat: 18,
    ingredients: [
      { id: "20000000-0000-0000-0000-000000000015", name: "Chickpeas", quantity: 1, unit: "can", category: ItemCategory.OTHER },
      { id: "20000000-0000-0000-0000-000000000016", name: "Greek yogurt", quantity: 0.5, unit: "cup", category: ItemCategory.DAIRY },
      { id: "20000000-0000-0000-0000-000000000017", name: "Spinach", quantity: 1, unit: "cup", category: ItemCategory.VEGETABLES }
    ]
  }
] as const;

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