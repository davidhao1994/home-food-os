import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { requireUser } from "@/lib/auth";
import { isFamilyDemoModeEnabled } from "@/lib/family-demo";
import { prisma } from "@/lib/prisma";
import { ensureBaseRecipes } from "@/services/recipe-catalog.service";
import { buildInventoryAlerts } from "@/services/inventory-alerts.service";
import { calculateNutritionSummary } from "@/services/nutrition.service";
import { buildRecipeRecommendations } from "@/services/recommendation.service";
import { getExpirationBucket, isExpiringSoonBucket } from "@/utils/food";

export default async function DashboardPage() {
  const user = await requireUser();
  const isDemoMode = isFamilyDemoModeEnabled();

  const [shoppingCount, inventoryItems, recentItems, recipes] = await Promise.all([
    prisma.shoppingListItem.count({ where: { userId: user.id, isPurchased: false } }),
    prisma.inventoryItem.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.inventoryItem.findMany({ where: { userId: user.id }, take: 5, orderBy: { createdAt: "desc" } }),
    ensureBaseRecipes(prisma)
  ]);

  const inventoryCount = inventoryItems.length;
  const nutritionSummary = calculateNutritionSummary(inventoryItems);
  const recommendations = buildRecipeRecommendations(inventoryItems, recipes);
  const alerts = buildInventoryAlerts(inventoryItems);
  const recommendedCount = recommendations.filter((recipe) => recipe.matchScore > 0).length;

  const expiringSoon = inventoryItems.filter((item) => {
    const bucket = getExpirationBucket(item.expirationDate);
    return isExpiringSoonBucket(bucket);
  }).length;

  return (
    <DashboardOverview
      isDemoMode={isDemoMode}
      inventoryCount={inventoryCount}
      shoppingCount={shoppingCount}
      expiringSoon={expiringSoon}
      recommendedCount={recommendedCount}
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
        matchScore: recipe.matchScore
      }))}
    />
  );
}
