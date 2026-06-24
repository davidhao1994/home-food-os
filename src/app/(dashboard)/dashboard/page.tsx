import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { requireUser } from "@/lib/auth";
import { isFamilyDemoModeEnabled } from "@/lib/family-demo";
import { prisma } from "@/lib/prisma";
import { ensureBaseRecipes } from "@/services/recipe-catalog.service";
import { buildInventoryAlerts } from "@/services/inventory-alerts.service";
import { calculateNutritionSummary } from "@/services/nutrition.service";
import { buildRecipeRecommendations } from "@/services/recommendation.service";
import { normalizeFoodName } from "@/utils/food";
import { getExpirationBucket, isExpiringSoonBucket } from "@/utils/food";

export default async function DashboardPage() {
  const user = await requireUser();
  const isDemoMode = isFamilyDemoModeEnabled();

  const [shoppingCount, inventoryItems, recentItems, recipes, receiptLines] = await Promise.all([
    prisma.shoppingListItem.count({ where: { userId: user.id, isPurchased: false } }),
    prisma.inventoryItem.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.inventoryItem.findMany({ where: { userId: user.id }, take: 5, orderBy: { createdAt: "desc" } }),
    ensureBaseRecipes(prisma),
    prisma.ocrResult.findMany({
      where: {
        lineStatus: "CONFIRMED",
        receiptUpload: {
          userId: user.id
        }
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        extractedName: true,
        receiptUpload: {
          select: {
            uploadedAt: true
          }
        }
      }
    })
  ]);

  const inventoryCount = inventoryItems.length;
  const nutritionSummary = calculateNutritionSummary(inventoryItems);
  const recommendations = buildRecipeRecommendations(inventoryItems, recipes);
  const alerts = buildInventoryAlerts(inventoryItems);
  const recommendedCount = recommendations.filter((recipe) => recipe.matchScore > 0).length;
  const topRecommendation = recommendations[0] ?? null;
  const missingForTopRecommendation = topRecommendation?.missingIngredients.slice(0, 5) ?? [];

  const expiringSoon = inventoryItems.filter((item) => {
    const bucket = getExpirationBucket(item.expirationDate);
    return isExpiringSoonBucket(bucket);
  }).length;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const plusThreeDays = new Date(startOfDay);
  plusThreeDays.setDate(plusThreeDays.getDate() + 3);

  const expiringToday = inventoryItems.filter((item) => {
    if (!item.expirationDate) {
      return false;
    }

    const value = new Date(item.expirationDate);
    return value >= startOfDay && value < new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  }).length;

  const expiringIn3Days = inventoryItems.filter((item) => {
    if (!item.expirationDate) {
      return false;
    }

    const value = new Date(item.expirationDate);
    return value > new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000) && value <= plusThreeDays;
  }).length;

  const pendingShoppingNames = new Set(
    (await prisma.shoppingListItem.findMany({ where: { userId: user.id, isPurchased: false }, select: { name: true } })).map((item) => normalizeFoodName(item.name))
  );

  const rebuyMap = new Map<string, { name: string; count: number; lastSeen: Date }>();
  for (const line of receiptLines) {
    const key = normalizeFoodName(line.extractedName);
    if (!key) {
      continue;
    }

    const current = rebuyMap.get(key);
    if (!current) {
      rebuyMap.set(key, { name: line.extractedName, count: 1, lastSeen: line.receiptUpload.uploadedAt });
      continue;
    }

    current.count += 1;
    if (line.receiptUpload.uploadedAt > current.lastSeen) {
      current.lastSeen = line.receiptUpload.uploadedAt;
    }
  }

  const smartRebuySuggestions = [...rebuyMap.entries()]
    .map(([key, value]) => ({
      key,
      name: value.name,
      count: value.count,
      staleDays: Math.max(0, Math.floor((Date.now() - value.lastSeen.getTime()) / (24 * 60 * 60 * 1000)))
    }))
    .filter((item) => item.count >= 2 && item.staleDays >= 7 && !pendingShoppingNames.has(item.key))
    .sort((a, b) => b.count - a.count || b.staleDays - a.staleDays)
    .slice(0, 6);

  return (
    <DashboardOverview
      isDemoMode={isDemoMode}
      inventoryCount={inventoryCount}
      shoppingCount={shoppingCount}
      expiringSoon={expiringSoon}
      expiringToday={expiringToday}
      expiringIn3Days={expiringIn3Days}
      recommendedCount={recommendedCount}
      smartRebuyCount={smartRebuySuggestions.length}
      smartRebuyItems={smartRebuySuggestions.map((item) => item.name)}
      missingForTopRecommendation={missingForTopRecommendation}
      nutritionSummary={{
        totalProtein: nutritionSummary.totalProtein,
        totalCalories: nutritionSummary.totalCalories
      }}
      alerts={alerts}
      recentItems={recentItems.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: Number(item.quantity),
        unit: item.unit,
        category: item.category
      }))}
      recommendations={recommendations.map((recipe) => ({
        recipeId: recipe.recipeId,
        name: recipe.name,
        matchScore: recipe.matchScore,
        reason: recipe.reason,
        missingIngredients: recipe.missingIngredients
      }))}
    />
  );
}
