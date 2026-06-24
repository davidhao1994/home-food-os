import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureBaseRecipes } from "@/services/recipe-catalog.service";
import { buildRecipeRecommendations } from "@/services/recommendation.service";
import { jsonResponse } from "@/utils/serialize";

const querySchema = z.object({
  cuisine: z.string().trim().min(1).optional(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
  maxCookTime: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : undefined))
    .refine((value) => value == null || Number.isFinite(value), "Invalid maxCookTime"),
  proteinTarget: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : undefined))
    .refine((value) => value == null || Number.isFinite(value), "Invalid proteinTarget"),
  proteinType: z.enum(["chicken", "beef", "pork", "seafood", "tofu", "egg", "plant", "mixed"]).optional(),
  dietaryTag: z.string().trim().min(1).optional(),
  favorites: z
    .string()
    .optional()
    .transform((value) => (value ? value.split(",").filter(Boolean) : [])),
  hidden: z
    .string()
    .optional()
    .transform((value) => (value ? value.split(",").filter(Boolean) : [])),
  disliked: z
    .string()
    .optional()
    .transform((value) => (value ? value.split(",").filter(Boolean) : [])),
  recent: z
    .string()
    .optional()
    .transform((value) => (value ? value.split(",").filter(Boolean) : [])),
  preferredCuisines: z
    .string()
    .optional()
    .transform((value) => (value ? value.split(",").filter(Boolean) : [])),
  preferredMealTypes: z
    .string()
    .optional()
    .transform((value) => (value ? value.split(",").filter(Boolean) : [])),
  seed: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : undefined))
    .refine((value) => value == null || Number.isFinite(value), "Invalid seed")
});

export async function GET(request: Request) {
  const user = await requireUser();
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    cuisine: searchParams.get("cuisine") ?? undefined,
    mealType: searchParams.get("mealType") ?? undefined,
    maxCookTime: searchParams.get("maxCookTime") ?? undefined,
    proteinTarget: searchParams.get("proteinTarget") ?? undefined,
    proteinType: searchParams.get("proteinType") ?? undefined,
    dietaryTag: searchParams.get("dietaryTag") ?? undefined,
    favorites: searchParams.get("favorites") ?? undefined,
    hidden: searchParams.get("hidden") ?? undefined,
    disliked: searchParams.get("disliked") ?? undefined,
    recent: searchParams.get("recent") ?? undefined,
    preferredCuisines: searchParams.get("preferredCuisines") ?? undefined,
    preferredMealTypes: searchParams.get("preferredMealTypes") ?? undefined,
    seed: searchParams.get("seed") ?? undefined
  });

  if (!parsed.success) {
    return jsonResponse({ error: "Invalid query parameters" }, { status: 400 });
  }

  const [inventory, recipes] = await Promise.all([
    prisma.inventoryItem.findMany({ where: { userId: user.id } }),
    ensureBaseRecipes(prisma)
  ]);

  const recommendations = buildRecipeRecommendations(inventory, recipes, {
    cuisine: parsed.data.cuisine,
    mealType: parsed.data.mealType,
    maxCookTime: parsed.data.maxCookTime,
    proteinTarget: parsed.data.proteinTarget,
    proteinType: parsed.data.proteinType,
    dietaryTag: parsed.data.dietaryTag,
    favoriteRecipeIds: parsed.data.favorites,
    hiddenRecipeIds: parsed.data.hidden,
    dislikedRecipeIds: parsed.data.disliked,
    recentRecipeIds: parsed.data.recent,
    preferredCuisines: parsed.data.preferredCuisines,
    preferredMealTypes: parsed.data.preferredMealTypes?.filter(
      (value): value is "breakfast" | "lunch" | "dinner" | "snack" =>
        value === "breakfast" || value === "lunch" || value === "dinner" || value === "snack"
    ),
    randomSeed: parsed.data.seed
  });

  return jsonResponse({ recommendations });
}
