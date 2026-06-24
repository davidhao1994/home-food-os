import { InventoryItem, Recipe, RecipeIngredient } from "@prisma/client";
import { findBuiltInRecipeByTitle } from "@/services/recipe-library";
import { RecipeRecommendation } from "@/types/domain";
import { getExpirationBucket, isExpiringSoonBucket, normalizeFoodName } from "@/utils/food";

type RecipeWithIngredients = Recipe & { ingredients: RecipeIngredient[] };

type RecommendationOptions = {
  cuisine?: string;
  mealType?: "breakfast" | "lunch" | "dinner" | "snack";
  maxCookTime?: number;
  proteinTarget?: number;
  proteinType?: "chicken" | "beef" | "pork" | "seafood" | "tofu" | "egg" | "plant" | "mixed";
  dietaryTag?: string;
  favoriteRecipeIds?: string[];
  recentRecipeIds?: string[];
  hiddenRecipeIds?: string[];
  dislikedRecipeIds?: string[];
  preferredCuisines?: string[];
  preferredMealTypes?: Array<"breakfast" | "lunch" | "dinner" | "snack">;
  randomSeed?: number;
};

type RecipeMetadata = {
  source: "BUILT_IN" | "USER" | "IMPORTED" | "FAMILY_FAVORITES";
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  difficulty: "easy" | "medium" | "hard";
  proteinType: "chicken" | "beef" | "pork" | "seafood" | "tofu" | "egg" | "plant" | "mixed";
  dietaryTags: string[];
};

const RECIPE_METADATA_OVERRIDES: Record<string, Omit<RecipeMetadata, "difficulty">> = {
  "egg fried rice": {
    source: "BUILT_IN",
    mealType: "dinner",
    proteinType: "egg",
    dietaryTags: ["quick", "family-friendly"]
  },
  "chicken broccoli stir-fry": {
    source: "BUILT_IN",
    mealType: "dinner",
    proteinType: "chicken",
    dietaryTags: ["high-protein", "weeknight"]
  },
  "miso tofu rice bowl": {
    source: "BUILT_IN",
    mealType: "lunch",
    proteinType: "tofu",
    dietaryTags: ["vegetarian", "high-fiber"]
  },
  "korean salmon bowl": {
    source: "BUILT_IN",
    mealType: "dinner",
    proteinType: "seafood",
    dietaryTags: ["omega-3", "high-protein"]
  },
  "milk egg scramble": {
    source: "BUILT_IN",
    mealType: "breakfast",
    proteinType: "egg",
    dietaryTags: ["quick", "high-protein"]
  },
  "mediterranean chickpea bowl": {
    source: "BUILT_IN",
    mealType: "lunch",
    proteinType: "plant",
    dietaryTags: ["vegetarian", "high-fiber"]
  }
};

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function toDifficultyLabel(value: Recipe["difficulty"]): RecipeMetadata["difficulty"] {
  const normalized = String(value).toLowerCase();
  if (normalized === "easy" || normalized === "hard") {
    return normalized;
  }

  return "medium";
}

function hashString(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function seededJitter(seed: number, key: string) {
  const value = Math.sin((seed + 1) * (hashString(key) + 17)) * 10000;
  return value - Math.floor(value);
}

function deriveRecipeMetadata(recipe: RecipeWithIngredients): RecipeMetadata {
  const builtIn = findBuiltInRecipeByTitle(recipe.name);
  if (builtIn) {
    return {
      source: "BUILT_IN",
      mealType: builtIn.mealType,
      difficulty: toDifficultyLabel(recipe.difficulty),
      proteinType: builtIn.proteinType,
      dietaryTags: builtIn.tags
    };
  }

  const normalizedName = normalizeFoodName(recipe.name);
  const override = RECIPE_METADATA_OVERRIDES[normalizedName];
  if (override) {
    return {
      ...override,
      difficulty: toDifficultyLabel(recipe.difficulty)
    };
  }

  const ingredientNames = recipe.ingredients.map((ingredient) => normalizeFoodName(ingredient.name));
  const joined = ` ${ingredientNames.join(" ")} ${normalizedName} `;

  let proteinType: RecipeMetadata["proteinType"] = "mixed";
  if (joined.includes("chicken")) {
    proteinType = "chicken";
  } else if (joined.includes("beef")) {
    proteinType = "beef";
  } else if (joined.includes("pork")) {
    proteinType = "pork";
  } else if (joined.includes("salmon") || joined.includes("fish") || joined.includes("shrimp") || joined.includes("seafood")) {
    proteinType = "seafood";
  } else if (joined.includes("tofu")) {
    proteinType = "tofu";
  } else if (joined.includes("egg")) {
    proteinType = "egg";
  } else if (joined.includes("bean") || joined.includes("chickpea") || joined.includes("lentil")) {
    proteinType = "plant";
  }

  let mealType: RecipeMetadata["mealType"] = "dinner";
  if (recipe.cookTime <= 12 || joined.includes("scramble") || joined.includes("breakfast")) {
    mealType = "breakfast";
  } else if (recipe.cookTime <= 20) {
    mealType = "lunch";
  }

  const dietaryTags: string[] = [];
  if (proteinType === "tofu" || proteinType === "plant") {
    dietaryTags.push("vegetarian");
  }
  if (recipe.cookTime <= 20) {
    dietaryTags.push("quick");
  }
  if (Number(recipe.protein ?? 0) >= 25) {
    dietaryTags.push("high-protein");
  }

  return {
    source: "BUILT_IN",
    mealType,
    difficulty: toDifficultyLabel(recipe.difficulty),
    proteinType,
    dietaryTags
  };
}

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

  const hiddenRecipeIds = new Set(options.hiddenRecipeIds ?? []);
  const dislikedRecipeIds = new Set(options.dislikedRecipeIds ?? []);
  const favoriteRecipeIds = new Set(options.favoriteRecipeIds ?? []);
  const recentRecipeIds = options.recentRecipeIds ?? [];
  const recentWeightById = new Map<string, number>();
  recentRecipeIds.forEach((recipeId, index) => {
    const rank = recentRecipeIds.length - index;
    recentWeightById.set(recipeId, rank / Math.max(recentRecipeIds.length, 1));
  });

  const preferredCuisines = new Set((options.preferredCuisines ?? []).map((value) => value.toLowerCase()));
  const preferredMealTypes = new Set(options.preferredMealTypes ?? []);
  const randomSeed = Number.isFinite(options.randomSeed) ? Number(options.randomSeed) : Date.now();

  return recipes
    .filter((recipe) => !hiddenRecipeIds.has(recipe.id) && !dislikedRecipeIds.has(recipe.id))
    .filter((recipe) => (options.cuisine ? recipe.cuisine.toLowerCase() === options.cuisine.toLowerCase() : true))
    .filter((recipe) => (options.maxCookTime != null ? recipe.cookTime <= options.maxCookTime : true))
    .filter((recipe) => (options.proteinTarget != null ? Number(recipe.protein ?? 0) >= options.proteinTarget : true))
    .filter((recipe) => {
      const metadata = deriveRecipeMetadata(recipe);
      return options.mealType ? metadata.mealType === options.mealType : true;
    })
    .filter((recipe) => {
      const metadata = deriveRecipeMetadata(recipe);
      return options.proteinType ? metadata.proteinType === options.proteinType : true;
    })
    .filter((recipe) => {
      const metadata = deriveRecipeMetadata(recipe);
      return options.dietaryTag ? metadata.dietaryTags.map((tag) => tag.toLowerCase()).includes(options.dietaryTag.toLowerCase()) : true;
    })
    .map((recipe) => {
      const metadata = deriveRecipeMetadata(recipe);
      const builtIn = findBuiltInRecipeByTitle(recipe.name);
      const required = recipe.ingredients.filter((ingredient) => !ingredient.isOptional);
      const matched = required.filter((ingredient) => inventoryByName.has(normalizeFoodName(ingredient.name)));
      const missingDetailed = required.filter((ingredient) => !inventoryByName.has(normalizeFoodName(ingredient.name)));
      const missing = missingDetailed.map((ingredient) => ingredient.name);

      const inventoryMatch = required.length === 0 ? 1 : matched.length / required.length;
      const matchedNames = matched.map((ingredient) => ingredient.name);
      const expiringMatches = matchedNames.filter((ingredientName) => {
        const candidates = inventoryByName.get(normalizeFoodName(ingredientName)) ?? [];
        return candidates.some((item) => isExpiringSoonBucket(getExpirationBucket(item.expirationDate)));
      });

      const expiringIngredientMatch = matchedNames.length === 0 ? 0 : expiringMatches.length / matchedNames.length;
      const missingPenalty = required.length === 0 ? 0 : missing.length / required.length;
      const cuisinePreference = preferredCuisines.has(recipe.cuisine.toLowerCase()) ? 1 : 0;
      const mealTypePreference = preferredMealTypes.size === 0 || preferredMealTypes.has(metadata.mealType) ? 1 : 0;
      const userPreference = clamp(cuisinePreference * 0.65 + mealTypePreference * 0.35);
      const recentPenalty = clamp(recentWeightById.get(recipe.id) ?? 0);
      const favoriteBoost = favoriteRecipeIds.has(recipe.id) ? 0.12 : 0;
      const varietyScore = clamp(1 - recentPenalty);
      const mealTypeMatch = options.mealType ? (metadata.mealType === options.mealType ? 1 : 0) : mealTypePreference;
      const randomJitter = (seededJitter(randomSeed, recipe.id) - 0.5) * 0.06;

      const weightedScore =
        inventoryMatch * 0.38 +
        expiringIngredientMatch * 0.3 +
        userPreference * 0.15 +
        varietyScore * 0.12 +
        mealTypeMatch * 0.08 -
        missingPenalty * 0.2 +
        favoriteBoost -
        recentPenalty * 0.14 +
        randomJitter;

      const score = Math.round(clamp(weightedScore, 0, 1.2) * 100);

      const matchedPreview = matchedNames.slice(0, 3).join(", ");
      const expiringPreview = expiringMatches.slice(0, 2).join("、");
      const missingPreview = missing.slice(0, 3).join(", ");

      const reason = [
        `You have ${matched.length}/${Math.max(required.length, 1)} ingredients`,
        matched.length > 0 ? `Uses: ${matchedPreview}${matchedNames.length > 3 ? ` +${matchedNames.length - 3}` : ""}` : null,
        missing.length > 0 ? `Missing: ${missingPreview}${missing.length > 3 ? ` +${missing.length - 3}` : ""}` : "Missing: none",
        `About ${recipe.cookTime} min ${metadata.dietaryTags.includes("quick") ? "- Quick meal" : ""}`
      ]
        .filter(Boolean)
        .join(". ");

      const reasonZh = [
        `你已有 ${matched.length}/${Math.max(required.length, 1)} 个食材`,
        matched.length > 0 ? `可用掉：${matchedNames.slice(0, 3).join("、")}${matchedNames.length > 3 ? ` 等${matchedNames.length}项` : ""}` : null,
        missing.length > 0 ? `还缺：${missing.slice(0, 3).join("、")}${missing.length > 3 ? ` 等${missing.length}项` : ""}` : "不缺食材",
        expiringMatches.length > 0 ? `可优先消耗临期食材：${expiringPreview}` : null,
        `约 ${recipe.cookTime} 分钟`
      ]
        .filter(Boolean)
        .join(" · ");

      return {
        recipeId: recipe.id,
        name: recipe.name,
        titleEn: builtIn?.titleEn ?? recipe.name,
        titleZh: builtIn?.titleZh,
        matchScore: score,
        ingredientMatchPercent: score,
        source: metadata.source,
        mealType: metadata.mealType,
        difficulty: metadata.difficulty,
        proteinType: metadata.proteinType,
        dietaryTags: metadata.dietaryTags,
        missingIngredients: missing,
        missingIngredientsDetailed: missingDetailed.map((ingredient) => ({
          name: ingredient.name,
          quantity: ingredient.quantity ? Number(ingredient.quantity) : null,
          unit: ingredient.unit ?? null,
          category: ingredient.category ?? null
        })),
        matchedIngredients: matchedNames,
        reason,
        reasonZh,
        scoreBreakdown: {
          inventoryMatch: Math.round(inventoryMatch * 100) / 100,
          expiringIngredientMatch: Math.round(expiringIngredientMatch * 100) / 100,
          userPreference: Math.round(userPreference * 100) / 100,
          varietyScore: Math.round(varietyScore * 100) / 100,
          mealTypeMatch: Math.round(mealTypeMatch * 100) / 100,
          missingPenalty: Math.round(missingPenalty * 100) / 100,
          favoriteBoost: Math.round(favoriteBoost * 100) / 100,
          recentPenalty: Math.round(recentPenalty * 100) / 100,
          randomJitter: Math.round(randomJitter * 100) / 100
        },
        estimatedCalories: recipe.calories,
        estimatedProtein: recipe.protein ? Number(recipe.protein) : null,
        estimatedFat: recipe.fat ? Number(recipe.fat) : null,
        estimatedCarbs: recipe.carbs ? Number(recipe.carbs) : null,
        cookingTime: recipe.cookTime,
        cuisine: recipe.cuisine
      };
    })
    .sort(
      (a, b) =>
        b.matchScore - a.matchScore ||
        a.missingIngredients.length - b.missingIngredients.length ||
        a.name.localeCompare(b.name)
    );
}
