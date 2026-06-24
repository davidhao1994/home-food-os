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
  const tr = (en: string, zh: string) => (language === "zh" ? zh : en);
  const topRecommendation = recommendations[0] ?? null;
  const todayActions: Array<{ id: string; emoji: string; title: string; detail: string; href: Route; icon: typeof AlertTriangle }> = [
    {
      id: "expiring",
      emoji: "🥚",
      title: expiringSoon > 0 ? tr(`Expiring Soon: ${expiringSoon} item${expiringSoon === 1 ? "" : "s"}`, `快过期了：${expiringSoon}项`) : tr("Expiring Soon: all clear", "快过期了：今天没有"),
      detail: expiringSoon > 0 ? tr("Use these first to avoid waste.", "优先吃这些，减少浪费。") : tr("You are clear on spoilage risk today.", "今天临期风险较低。"),
      href: "/inventory?filter=expiring" as Route,
      icon: AlertTriangle
    },
    {
      id: "shopping",
      emoji: "🛒",
      title: shoppingCount > 0 ? tr(`Buy This Week: ${shoppingCount} item${shoppingCount === 1 ? "" : "s"}`, `需要买：${shoppingCount}项`) : tr("Buy This Week: no gaps", "需要买：目前无需补货"),
      detail: shoppingCount > 0 ? tr("Complete the list before your next meal prep.", "下次做饭前先补齐。") : tr("No missing essentials are tracked right now.", "暂未发现缺少的必需品。"),
      href: "/shopping",
      icon: ShoppingCart
    },
    {
      id: "recipes",
      emoji: "🍜",
      title: topRecommendation ? tr(`Cook Tonight: ${topRecommendation.name}`, `今晚可以做：${topRecommendation.name}`) : tr("Cook Tonight: no strong match yet", "今晚可以做：暂无高匹配"),
      detail: topRecommendation ? tr(`${topRecommendation.matchScore}% match with your current inventory.`, `当前库存匹配度 ${topRecommendation.matchScore}%`) : tr("Add or scan inventory to unlock better matches.", "补充库存后推荐会更精准。"),
      href: "/recipes",
      icon: ChefHat
    },
    {
      id: "nutrition",
      emoji: "🥗",
      title: tr(`Nutrition: ${Math.round(nutritionSummary.totalProtein)}g protein ready`, `营养：已准备 ${Math.round(nutritionSummary.totalProtein)}g 蛋白质`),
      detail: tr(`${Math.round(nutritionSummary.totalCalories)} kcal available for planning today.`, `可用热量约 ${Math.round(nutritionSummary.totalCalories)} kcal。`),
      href: "/nutrition",
      icon: BarChart3
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
                <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{tr("What should I do today?", "今天先做什么？")}</h2>
                <p className="mt-2 text-sm text-muted-foreground md:text-base">
                  {tr("Start with high-priority actions: prevent spoilage, close shopping gaps, and pick tonight's best recipe.", "先做最重要的事：处理临期、补齐购物、决定今晚吃什么。")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {[
                    tr("What to cook tonight", "今晚吃什么"),
                    tr("Use expiring ingredients", "用掉快过期食材"),
                    tr("Quick meals", "快手菜"),
                    tr("Home-style", "家常菜"),
                    tr("High protein", "高蛋白"),
                    tr("Lighter", "清淡一点")
                  ].map((label) => (
                    <span key={label} className="rounded-full bg-background/80 px-2.5 py-1 text-muted-foreground">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-primary/20 bg-background/70 px-4 py-3 text-right shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{tr("Best tonight", "今晚推荐")}</p>
                <p className="mt-1 text-lg font-semibold">{topRecommendation?.name ?? tr("No strong match yet", "暂无高匹配")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{topRecommendation ? `${topRecommendation.matchScore}% ${tr("match", "匹配")}` : tr("Add more inventory to unlock suggestions.", "补充库存后可获得更好推荐。")}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {todayActions.map((task) => {
                const Icon = task.icon;

                return (
                  <Link
                    key={task.id}
                    href={task.href}
                    className="rounded-2xl border bg-background/75 p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-background active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Today</p>
                        <p className="mt-2 text-base font-semibold leading-tight text-foreground">
                          <span className="mr-2" aria-hidden="true">{task.emoji}</span>
                          {task.title}
                        </p>
                      </div>
                      <Icon className="h-5 w-5 shrink-0 text-primary" />
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
              <Link href={{ pathname: "/receipts", query: { capture: "1" } }} aria-label={t(language, "scanReceipt")}>
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
          helper={t(language, "recipesWithMatch")}
          href="/recipes"
        />
        <StatsCard
          title={t(language, "nutritionSummary")}
          value={`${Math.round(nutritionSummary.totalProtein)} g`}
          icon={<BarChart3 className="h-5 w-5" />}
          helper={`${Math.round(nutritionSummary.totalCalories)} ${t(language, "kcalAvailable")}`}
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
                  <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{recipe.matchScore}% {tr("match", "匹配")}</span>
                </div>
                <p className="mt-1 text-muted-foreground">{recipe.reason}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {recipe.missingIngredients.length > 0 ? `${tr("Missing", "缺少")}: ${recipe.missingIngredients.join(", ")}` : tr("Everything is already on hand.", "食材已基本齐全。")}
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
