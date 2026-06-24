import { PageHeader } from "@/components/shared/page-header";
import { ShoppingView } from "@/features/shopping/shopping-view";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { inferReceiptItemDetails } from "@/services/ocr.service";
import { ensureBaseRecipes } from "@/services/recipe-catalog.service";
import { buildRecipeRecommendations } from "@/services/recommendation.service";
import { normalizeFoodName } from "@/utils/food";

export default async function ShoppingPage() {
  const user = await requireUser();

  const [items, inventoryItems, receiptLines, recipes] = await Promise.all([
    prisma.shoppingListItem.findMany({
      where: { userId: user.id },
      orderBy: [{ isPurchased: "asc" }, { createdAt: "desc" }]
    }),
    prisma.inventoryItem.findMany({ where: { userId: user.id } }),
    prisma.ocrResult.findMany({
      where: {
        lineStatus: "CONFIRMED",
        receiptUpload: {
          userId: user.id
        }
      },
      orderBy: { createdAt: "desc" },
      take: 300,
      select: {
        extractedName: true,
        receiptUpload: {
          select: {
            uploadedAt: true
          }
        }
      }
    }),
    ensureBaseRecipes(prisma)
  ]);

  const pendingNames = new Set(items.filter((item) => !item.isPurchased).map((item) => normalizeFoodName(item.name)));
  const inventoryByName = new Map<string, number>();
  for (const item of inventoryItems) {
    const key = normalizeFoodName(item.name);
    inventoryByName.set(key, (inventoryByName.get(key) ?? 0) + Number(item.quantity));
  }

  const rebuyMap = new Map<string, { name: string; count: number; lastSeen: Date }>();
  for (const line of receiptLines) {
    const key = normalizeFoodName(line.extractedName);
    if (!key) {
      continue;
    }

    const existing = rebuyMap.get(key);
    if (!existing) {
      rebuyMap.set(key, { name: line.extractedName, count: 1, lastSeen: line.receiptUpload.uploadedAt });
      continue;
    }

    existing.count += 1;
    if (line.receiptUpload.uploadedAt > existing.lastSeen) {
      existing.lastSeen = line.receiptUpload.uploadedAt;
    }
  }

  const now = Date.now();
  const smartRebuySuggestions = [...rebuyMap.entries()]
    .map(([key, value]) => {
      const daysSinceLastSeen = Math.max(0, Math.floor((now - value.lastSeen.getTime()) / (24 * 60 * 60 * 1000)));
      const onHandQty = inventoryByName.get(key) ?? 0;
      const staleSignal = daysSinceLastSeen >= 7 ? 1 : 0;
      const lowStockSignal = onHandQty <= 1 ? 1 : 0;
      const score = value.count * 2 + staleSignal * 3 + lowStockSignal * 2;

      return {
        name: value.name,
        category: inferReceiptItemDetails(value.name).category,
        reason: daysSinceLastSeen >= 7 ? "frequently bought but not seen recently" : "frequently bought staple",
        score,
        count: value.count
      };
    })
    .filter((item) => !pendingNames.has(normalizeFoodName(item.name)))
    .sort((a, b) => b.score - a.score || b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 8);

  const recipeRecommendations = buildRecipeRecommendations(inventoryItems, recipes);
  const missingForRecipesMap = new Map<string, { name: string; recipeName: string; category: string | null }>();

  for (const recipe of recipeRecommendations.slice(0, 5)) {
    for (const ingredient of recipe.missingIngredientsDetailed) {
      const key = normalizeFoodName(ingredient.name);
      if (!key || pendingNames.has(key) || missingForRecipesMap.has(key)) {
        continue;
      }

      missingForRecipesMap.set(key, {
        name: ingredient.name,
        recipeName: recipe.titleZh ?? recipe.name,
        category: ingredient.category ?? null
      });
    }
  }

  const missingForRecipes = [...missingForRecipesMap.values()].slice(0, 10);

  return (
    <div>
      <PageHeader title="Smart Shopping / 智能购物" subtitle="Rebuy what you usually need, fill recipe gaps, and keep manual list as backup. / 优先回购常买食材，补齐做菜缺口，手动清单作为补充。" />
      <ShoppingView
        initialItems={items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          estimatedPrice: item.estimatedPrice ? Number(item.estimatedPrice) : null
        }))}
        smartRebuySuggestions={smartRebuySuggestions}
        missingForRecipes={missingForRecipes}
      />
    </div>
  );
}
