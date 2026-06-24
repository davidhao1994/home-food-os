import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureBaseRecipes } from "@/services/recipe-catalog.service";
import { buildRecipeRecommendations } from "@/services/recommendation.service";
import { jsonResponse } from "@/utils/serialize";

const querySchema = z.object({
  cuisine: z.string().trim().min(1).optional(),
  maxCookTime: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : undefined))
    .refine((value) => value == null || Number.isFinite(value), "Invalid maxCookTime"),
  proteinTarget: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : undefined))
    .refine((value) => value == null || Number.isFinite(value), "Invalid proteinTarget")
});

export async function GET(request: Request) {
  const user = await requireUser();
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    cuisine: searchParams.get("cuisine") ?? undefined,
    maxCookTime: searchParams.get("maxCookTime") ?? undefined,
    proteinTarget: searchParams.get("proteinTarget") ?? undefined
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
    maxCookTime: parsed.data.maxCookTime,
    proteinTarget: parsed.data.proteinTarget
  });

  return jsonResponse({ recommendations });
}
