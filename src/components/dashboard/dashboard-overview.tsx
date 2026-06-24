"use client";

import Link from "next/link";
import { AlertTriangle, Apple, ArrowRight, BarChart3, ShoppingCart, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatsCard } from "@/components/shared/stats-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import { useUiStore } from "@/store/ui-store";

type DashboardOverviewProps = {
  isDemoMode: boolean;
  inventoryCount: number;
  shoppingCount: number;
  expiringSoon: number;
  recommendedCount: number;
  nutritionSummary: {
    totalProtein: number;
    totalCalories: number;
  };
  alerts: Array<{
    id: string;
    title: string;
    detail: string;
  }>;
  recentItems: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    category: string;
  }>;
  recommendations: Array<{
    recipeId: string;
    name: string;
    matchScore: number;
  }>;
};

export function DashboardOverview({
  isDemoMode,
  inventoryCount,
  shoppingCount,
  expiringSoon,
  recommendedCount,
  nutritionSummary,
  alerts,
  recentItems,
  recommendations
}: DashboardOverviewProps) {
  const language = useUiStore((state) => state.language);

  return (
    <div>
      <PageHeader title={t(language, "dashboardTitle")} subtitle={t(language, "dashboardSubtitle")} />

      {isDemoMode ? (
        <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium">{t(language, "familyDemoMode")}</div>
      ) : null}

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Button asChild variant="outline" className="justify-start">
          <Link href="/inventory" aria-label={t(language, "addFood")}>
            {t(language, "addFood")}
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-start">
          <Link href="/shopping" aria-label={t(language, "addShoppingItem")}>
            {t(language, "addShoppingItem")}
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-start">
          <Link href="/receipts" aria-label={t(language, "scanReceipt")}>
            {t(language, "scanReceipt")}
          </Link>
        </Button>
        <Button asChild variant="outline" className="justify-start">
          <Link href="/assistant" aria-label={t(language, "askAiCooking")}>
            {t(language, "askAiCooking")}
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatsCard title={t(language, "inventoryCount")} value={inventoryCount} icon={<Apple className="h-5 w-5" />} href="/inventory" />
        <StatsCard title={t(language, "shoppingList")} value={shoppingCount} icon={<ShoppingCart className="h-5 w-5" />} href="/shopping" />
        <StatsCard title={t(language, "expiringSoon")} value={expiringSoon} icon={<AlertTriangle className="h-5 w-5" />} href="/inventory?filter=expiring" />
        <StatsCard
          title={t(language, "recommendedRecipes")}
          value={recommendedCount}
          icon={<Sparkles className="h-5 w-5" />}
          helper="Recipes with at least one ingredient match"
          href="/recipes"
        />
        <StatsCard
          title={t(language, "nutritionSummary")}
          value={`${Math.round(nutritionSummary.totalProtein)} g`}
          icon={<BarChart3 className="h-5 w-5" />}
          helper={`${Math.round(nutritionSummary.totalCalories)} kcal available`}
          href="/nutrition"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t(language, "inventoryAlerts")}</CardTitle>
            <Button asChild variant="ghost" size="sm" className="h-8 px-2">
              <Link href="/inventory" aria-label={t(language, "viewInventory")}>{t(language, "viewInventory")}</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.length === 0 ? <p className="text-sm text-muted-foreground">{t(language, "noActiveAlerts")}</p> : null}
            {alerts.map((alert) => (
              <Link
                key={alert.id}
                href="/inventory"
                aria-label={`${t(language, "openSection")} ${t(language, "inventoryAlerts")}`}
                className="group block rounded-lg border p-3 text-sm transition hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <p className="font-medium">{alert.title}</p>
                <p className="text-muted-foreground">{alert.detail}</p>
                <span className="mt-1 inline-flex items-center gap-1 text-xs text-primary">
                  {t(language, "viewInventory")}
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t(language, "recentlyAddedFoods")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentItems.length === 0 ? <p className="text-sm text-muted-foreground">{t(language, "noInventoryYet")}</p> : null}
            {recentItems.map((item) => (
              <Link
                key={item.id}
                href="/inventory"
                aria-label={`${t(language, "openSection")} ${item.name}`}
                className="group block rounded-lg border p-3 text-sm transition hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <p className="font-medium">{item.name}</p>
                <p className="text-muted-foreground">
                  {item.quantity} {item.unit} • {item.category.replace("_", " ")}
                </p>
              </Link>
            ))}
            {recentItems.length === 0 ? (
              <Button asChild variant="outline" size="sm" className="mt-2">
                <Link href="/inventory">{t(language, "viewInventory")}</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t(language, "topRecipeMatches")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recommendations.length === 0 ? <p className="text-sm text-muted-foreground">{t(language, "noRecipeCatalog")}</p> : null}
            {recommendations.slice(0, 3).map((recipe) => (
              <Link
                key={recipe.recipeId}
                href="/recipes"
                aria-label={`${t(language, "openSection")} ${recipe.name}`}
                className="group block rounded-lg border p-3 text-sm transition hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <p className="font-medium">{recipe.name}</p>
                <p className="text-muted-foreground">{recipe.matchScore}% match</p>
              </Link>
            ))}
            <div className="pt-1">
              <Button asChild variant="outline" size="sm">
                <Link href="/recipes">{t(language, "viewAllRecipes")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
