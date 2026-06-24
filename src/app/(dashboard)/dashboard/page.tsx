import Link from "next/link";
import { AlertTriangle, Apple, BarChart3, ShoppingCart, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatsCard } from "@/components/shared/stats-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div>
      <PageHeader title="Home Food OS" subtitle="Track inventory, expiring items, meals, and nutrition at a glance." />

      {isDemoMode ? (
        <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium">
          Family Demo Mode - shared home inventory
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Button asChild variant="outline" className="justify-start">
          <Link href="/inventory">Add Food</Link>
        </Button>
        <Button asChild variant="outline" className="justify-start">
          <Link href="/shopping">Add Shopping Item</Link>
        </Button>
        <Button asChild variant="outline" className="justify-start">
          <Link href="/receipts">Scan Receipt</Link>
        </Button>
        <Button asChild variant="outline" className="justify-start">
          <Link href="/assistant">Ask AI What to Cook</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatsCard title="Inventory Count" value={inventoryCount} icon={<Apple className="h-5 w-5" />} />
        <StatsCard title="Shopping List" value={shoppingCount} icon={<ShoppingCart className="h-5 w-5" />} />
        <StatsCard title="Expiring Soon" value={expiringSoon} icon={<AlertTriangle className="h-5 w-5" />} />
        <StatsCard title="Recommended Recipes" value={recommendedCount} icon={<Sparkles className="h-5 w-5" />} helper="Recipes with at least one ingredient match" />
        <StatsCard title="Nutrition Summary" value={`${Math.round(nutritionSummary.totalProtein)} g`} icon={<BarChart3 className="h-5 w-5" />} helper={`${Math.round(nutritionSummary.totalCalories)} kcal available`} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Inventory Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.length === 0 ? <p className="text-sm text-muted-foreground">No active alerts right now.</p> : null}
            {alerts.map((alert) => (
              <div key={alert.id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{alert.title}</p>
                <p className="text-muted-foreground">{alert.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recently Added Foods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentItems.length === 0 ? <p className="text-sm text-muted-foreground">No inventory yet.</p> : null}
            {recentItems.map((item) => (
              <div key={item.id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{item.name}</p>
                <p className="text-muted-foreground">
                  {Number(item.quantity)} {item.unit} • {item.category.replace("_", " ")}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Recipe Matches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recommendations.length === 0 ? <p className="text-sm text-muted-foreground">No recipe catalog available yet.</p> : null}
            {recommendations.slice(0, 3).map((recipe) => (
              <div key={recipe.recipeId} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{recipe.name}</p>
                <p className="text-muted-foreground">{recipe.matchScore}% match</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
