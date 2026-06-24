"use client";

import Link from "next/link";
import type { Route } from "next";
import { AlertTriangle, Apple, ArrowRight, BarChart3, ChefHat, Receipt, ShoppingCart, Sparkles, WandSparkles } from "lucide-react";
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
    reason: string;
    missingIngredients: string[];
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
  const topRecommendation = recommendations[0] ?? null;
  const todayTasks: Array<{
    label: string;
    value: number;
    detail: string;
    href: Route;
    icon: typeof AlertTriangle;
  }> = [
    {
      label: "Use soon",
      value: expiringSoon,
      detail: expiringSoon > 0 ? "Move expiring food into tonight's plan." : "No urgent spoilage risk right now.",
      href: "/inventory?filter=expiring" as Route,
      icon: AlertTriangle
    },
    {
      label: "Buy next",
      value: shoppingCount,
      detail: shoppingCount > 0 ? "Your list is waiting for the next grocery run." : "Shopping list is clear for now.",
      href: "/shopping",
      icon: ShoppingCart
    },
    {
      label: "Cook tonight",
      value: recommendedCount,
      detail: topRecommendation ? topRecommendation.name : "Add a few staples to unlock recipe matches.",
      href: "/recipes",
      icon: ChefHat
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t(language, "dashboardTitle")} subtitle={t(language, "dashboardSubtitle")} />

      {isDemoMode ? (
        <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium">{t(language, "familyDemoMode")}</div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1.3fr,0.9fr]">
        <Card className="overflow-hidden border-primary/20 bg-[linear-gradient(135deg,rgba(182,226,196,0.22),rgba(255,255,255,0.96)_55%,rgba(255,214,153,0.2))]">
          <CardContent className="p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Today</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Plan the next 24 hours before food gets wasted.</h2>
                <p className="mt-2 text-sm text-muted-foreground md:text-base">
                  Start with the fast actions that keep the kitchen current: scan receipts, use expiring items, and close missing ingredients in one tap.
                </p>
              </div>
              <div className="rounded-2xl border border-primary/20 bg-background/70 px-4 py-3 text-right shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Best tonight</p>
                <p className="mt-1 text-lg font-semibold">{topRecommendation?.name ?? "No strong match yet"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{topRecommendation ? `${topRecommendation.matchScore}% match` : "Add more inventory to unlock suggestions."}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {todayTasks.map((task) => {
                const Icon = task.icon;

                return (
                  <Link
                    key={task.label}
                    href={task.href}
                    className="rounded-2xl border bg-background/75 p-4 transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{task.label}</p>
                        <p className="mt-2 text-3xl font-semibold">{task.value}</p>
                      </div>
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{task.detail}</p>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><WandSparkles className="h-4 w-4 text-primary" /> Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button asChild className="col-span-2 h-12 justify-start rounded-2xl">
              <Link href="/receipts" aria-label={t(language, "scanReceipt")}>
                <Receipt className="mr-2 h-4 w-4" />
                {t(language, "scanReceipt")}
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start rounded-2xl">
              <Link href="/inventory" aria-label={t(language, "addFood")}>
                <Apple className="mr-2 h-4 w-4" />
                {t(language, "addFood")}
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start rounded-2xl">
              <Link href="/shopping" aria-label={t(language, "addShoppingItem")}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                {t(language, "addShoppingItem")}
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start rounded-2xl">
              <Link href="/recipes" aria-label={t(language, "viewAllRecipes")}>
                <ChefHat className="mr-2 h-4 w-4" />
                {t(language, "viewAllRecipes")}
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start rounded-2xl">
              <Link href="/assistant" aria-label={t(language, "askAiCooking")}>
                <Sparkles className="mr-2 h-4 w-4" />
                {t(language, "askAiCooking")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{recipe.name}</p>
                  <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{recipe.matchScore}% match</span>
                </div>
                <p className="mt-1 text-muted-foreground">{recipe.reason}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {recipe.missingIngredients.length > 0 ? `Missing: ${recipe.missingIngredients.join(", ")}` : "Everything is already on hand."}
                </p>
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
