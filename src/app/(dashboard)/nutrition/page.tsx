import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NutritionCharts } from "@/features/nutrition/nutrition-charts";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateNutritionSummary } from "@/services/nutrition.service";

export default async function NutritionPage() {
  const user = await requireUser();
  const items = await prisma.inventoryItem.findMany({ where: { userId: user.id } });
  const summary = calculateNutritionSummary(items);

  const categoryData = Object.entries(summary.categoryDistribution).map(([name, value]) => ({ name: name.replaceAll("_", " "), value }));
  const locationData = Object.entries(summary.locationDistribution).map(([name, value]) => ({ name: name.replaceAll("_", " "), value }));

  return (
    <div className="space-y-6">
      <PageHeader title="Nutrition Dashboard" subtitle="Macro estimates and inventory distributions." />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily Inventory Nutrition</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm text-muted-foreground">Calories: {Math.round(summary.dailyInventoryNutrition.calories)} kcal</p>
            <p className="text-sm text-muted-foreground">Protein: {Math.round(summary.dailyInventoryNutrition.protein)} g</p>
            <p className="text-sm text-muted-foreground">Fat: {Math.round(summary.dailyInventoryNutrition.fat)} g</p>
            <p className="text-sm text-muted-foreground">Carbs: {Math.round(summary.dailyInventoryNutrition.carbs)} g</p>
            <p className="text-sm text-muted-foreground">Fiber: {Math.round(summary.dailyInventoryNutrition.fiber)} g</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Protein Availability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-3xl font-semibold">{Math.round(summary.proteinAvailability.gramsAvailable)} g</p>
            <p className="text-sm text-muted-foreground">Estimated days at 120 g target: {summary.proteinAvailability.estimatedDaysAt120gTarget}</p>
            <p className="text-sm text-muted-foreground">Healthy Food Score: {summary.healthyFoodScore}/100</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Food Composition</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {summary.weeklyFoodComposition.length === 0 ? <p className="text-muted-foreground">No weekly composition yet.</p> : null}
          {summary.weeklyFoodComposition.map((row) => (
            <div key={row.category} className="rounded-lg border p-3">
              <p className="font-medium">{row.category.replaceAll("_", " ")}</p>
              <p className="text-muted-foreground">{Math.round(row.calories)} kcal/week • {Math.round(row.protein)} g protein/week</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Add inventory items to populate nutrition totals and distribution charts.
          </CardContent>
        </Card>
      ) : null}

      <NutritionCharts categoryData={categoryData} locationData={locationData} />
    </div>
  );
}
