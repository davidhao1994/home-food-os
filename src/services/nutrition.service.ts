import { InventoryItem } from "@prisma/client";
import { estimateItemNutrition } from "@/services/food-database.service";

type NutritionSummary = {
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  totalFiber: number;
  categoryDistribution: Record<string, number>;
  locationDistribution: Record<string, number>;
  dailyInventoryNutrition: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    fiber: number;
  };
  weeklyFoodComposition: Array<{ category: string; calories: number; protein: number }>;
  proteinAvailability: {
    gramsAvailable: number;
    estimatedDaysAt120gTarget: number;
  };
  healthyFoodScore: number;
};

export function calculateNutritionSummary(items: InventoryItem[]): NutritionSummary {
  const categoryMacroMap = new Map<string, { calories: number; protein: number }>();

  const summary = items.reduce<NutritionSummary>(
    (acc, item) => {
      const category = item.category;
      const location = item.storageLocation;
      const quantity = Number(item.quantity) || 0;
      const estimate = estimateItemNutrition(item.name, item.category, quantity, item.unit);

      acc.totalCalories += estimate.calories;
      acc.totalProtein += estimate.protein;
      acc.totalFat += estimate.fat;
      acc.totalCarbs += estimate.carbs;
      acc.totalFiber += estimate.fiber;
      acc.categoryDistribution[category] = (acc.categoryDistribution[category] ?? 0) + 1;
      acc.locationDistribution[location] = (acc.locationDistribution[location] ?? 0) + 1;

      const current = categoryMacroMap.get(category) ?? { calories: 0, protein: 0 };
      current.calories += estimate.calories;
      current.protein += estimate.protein;
      categoryMacroMap.set(category, current);

      return acc;
    },
    {
      totalCalories: 0,
      totalProtein: 0,
      totalFat: 0,
      totalCarbs: 0,
      totalFiber: 0,
      categoryDistribution: {},
      locationDistribution: {},
      dailyInventoryNutrition: {
        calories: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
        fiber: 0
      },
      weeklyFoodComposition: [],
      proteinAvailability: {
        gramsAvailable: 0,
        estimatedDaysAt120gTarget: 0
      },
      healthyFoodScore: 0
    }
  );

  summary.dailyInventoryNutrition = {
    calories: summary.totalCalories,
    protein: summary.totalProtein,
    fat: summary.totalFat,
    carbs: summary.totalCarbs,
    fiber: summary.totalFiber
  };

  summary.weeklyFoodComposition = Array.from(categoryMacroMap.entries())
    .map(([category, values]) => ({ category, calories: values.calories * 7, protein: values.protein * 7 }))
    .sort((left, right) => right.calories - left.calories);

  summary.proteinAvailability = {
    gramsAvailable: summary.totalProtein,
    estimatedDaysAt120gTarget: summary.totalProtein > 0 ? Number((summary.totalProtein / 120).toFixed(1)) : 0
  };

  const proteinDensity = summary.totalCalories > 0 ? (summary.totalProtein * 4) / summary.totalCalories : 0;
  const fiberDensity = summary.totalCalories > 0 ? (summary.totalFiber * 2) / summary.totalCalories : 0;
  const processedPenalty = (summary.categoryDistribution.SNACKS ?? 0) * 2 + (summary.categoryDistribution.CONDIMENTS ?? 0);
  summary.healthyFoodScore = Math.max(
    0,
    Math.min(100, Math.round(proteinDensity * 120 + fiberDensity * 400 + 65 - processedPenalty))
  );

  return summary;
}
