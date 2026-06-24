"use client";

import { useEffect, useMemo, useState } from "react";
import { Heart, HeartOff, Shuffle, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RecipeRecommendation } from "@/types/domain";

type RecipePreferences = {
  favorites: string[];
  hidden: string[];
  disliked: string[];
  recent: string[];
};

type Props = {
  recommendations: RecipeRecommendation[];
  preferences: RecipePreferences;
  onToggleFavorite: (recipeId: string) => void;
  onHide: (recipeId: string) => void;
  onNotInterested: (recipeId: string) => void;
  onRefresh: () => void;
  onMarkShown: (recipeIds: string[]) => void;
  isLoading?: boolean;
};

function formatMealType(value: RecipeRecommendation["mealType"]) {
  if (!value) {
    return "Any meal";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatProteinType(value: RecipeRecommendation["proteinType"]) {
  if (!value) {
    return "Mixed";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function RecommendationList({ recommendations, preferences, onToggleFavorite, onHide, onNotInterested, onRefresh, onMarkShown, isLoading = false }: Props) {
  const [pendingRecipeId, setPendingRecipeId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const visibleRecommendations = useMemo(
    () => recommendations.filter((recipe) => !preferences.hidden.includes(recipe.recipeId) && !preferences.disliked.includes(recipe.recipeId)),
    [recommendations, preferences.hidden, preferences.disliked]
  );

  useEffect(() => {
    onMarkShown(visibleRecommendations.slice(0, 4).map((recipe) => recipe.recipeId));
  }, [onMarkShown, visibleRecommendations]);

  const addMissingIngredients = async (recipe: RecipeRecommendation) => {
    if (recipe.missingIngredientsDetailed.length === 0) {
      return;
    }

    setPendingRecipeId(recipe.recipeId);
    setStatus(null);

    try {
      const response = await fetch("/api/shopping/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: recipe.name,
          ingredients: recipe.missingIngredientsDetailed.map((ingredient) => ({
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            category: ingredient.category
          }))
        })
      });

      if (!response.ok) {
        throw new Error("Unable to add the missing ingredients to shopping.");
      }

      const data = (await response.json()) as { createdCount: number; updatedCount: number };
      const totalQueued = data.createdCount + data.updatedCount;
      setStatus({
        tone: "success",
        message: totalQueued > 0 ? `${totalQueued} missing ingredient${totalQueued > 1 ? "s" : ""} added to shopping.` : "Shopping list already covered those ingredients."
      });
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Unable to add missing ingredients right now."
      });
    } finally {
      setPendingRecipeId(null);
    }
  };

  if (visibleRecommendations.length === 0 && !isLoading) {
    return <p className="text-sm text-muted-foreground">No recipes available yet. Seed or add recipes to get recommendations.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 rounded-2xl border bg-card p-3">
        <p className="text-xs text-muted-foreground">Recommendations are weighted by inventory, expiring items, preferences, and diversity rotation.</p>
        <Button type="button" variant="outline" size="sm" onClick={onRefresh} className="shrink-0">
          <Shuffle className="mr-1.5 h-3.5 w-3.5" />
          Refresh Recommendations
        </Button>
      </div>

      {status ? (
        <p
          className={
            status.tone === "error"
              ? "rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
              : "rounded-xl border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
          }
        >
          {status.message}
        </p>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`recipe-skeleton-${index}`} className="animate-pulse rounded-2xl border bg-card p-4">
              <div className="h-5 w-1/3 rounded bg-muted" />
              <div className="mt-3 h-4 w-full rounded bg-muted" />
              <div className="mt-2 h-4 w-3/4 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : null}

      {visibleRecommendations.map((recipe) => (
        <div key={recipe.recipeId} className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold">{recipe.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Cuisine: {recipe.cuisine ?? "Unknown"} • {formatMealType(recipe.mealType)} • {recipe.cookingTime} min
              </p>
            </div>
            <div className="flex items-center gap-2">
              {preferences.favorites.includes(recipe.recipeId) ? <Heart className="h-4 w-4 fill-current text-danger" /> : null}
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Score: {recipe.matchScore}%</span>
            </div>
          </div>

          <div className="mb-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{formatProteinType(recipe.proteinType)}</span>
            <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{recipe.difficulty ?? "medium"}</span>
            {recipe.source ? <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{recipe.source.replace("_", " ")}</span> : null}
            {(recipe.dietaryTags ?? []).slice(0, 2).map((tag) => (
              <span key={`${recipe.recipeId}-${tag}`} className="rounded-full bg-success/15 px-2 py-1 text-xs text-success">{tag}</span>
            ))}
          </div>

          <p className="text-sm text-foreground/90">{recipe.reason}</p>

          <div className="mt-3 space-y-3 rounded-xl border bg-muted/20 p-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Uses</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {recipe.matchedIngredients.length > 0 ? (
                  recipe.matchedIngredients.map((ingredient) => (
                    <span key={`${recipe.recipeId}-use-${ingredient}`} className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
                      ✓ {ingredient}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">No matched ingredients yet.</span>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Missing</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {recipe.missingIngredients.length > 0 ? (
                  recipe.missingIngredients.map((ingredient) => (
                    <span key={`${recipe.recipeId}-miss-${ingredient}`} className="rounded-full bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger">
                      ✗ {ingredient}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">✓ No missing ingredients</span>
                )}
              </div>
            </div>
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            Calories: {recipe.estimatedCalories ?? "N/A"} • Protein: {recipe.estimatedProtein ?? "N/A"} g • Carbs: {recipe.estimatedCarbs ?? "N/A"} g • Fat: {recipe.estimatedFat ?? "N/A"} g • Cook time: {recipe.cookingTime} min
          </p>

          {recipe.scoreBreakdown ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Score mix: inventory {Math.round(recipe.scoreBreakdown.inventoryMatch * 100)}% • expiring {Math.round(recipe.scoreBreakdown.expiringIngredientMatch * 100)}% • preference {Math.round(recipe.scoreBreakdown.userPreference * 100)}% • variety {Math.round(recipe.scoreBreakdown.varietyScore * 100)}%
            </p>
          ) : null}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">Add missing ingredients to your shopping list in one tap.</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onToggleFavorite(recipe.recipeId)}>
                <Heart className="mr-1.5 h-3.5 w-3.5" />
                {preferences.favorites.includes(recipe.recipeId) ? "Unfavorite" : "Favorite"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => onHide(recipe.recipeId)}>
                <HeartOff className="mr-1.5 h-3.5 w-3.5" />
                Hide
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => onNotInterested(recipe.recipeId)}>
                <ThumbsDown className="mr-1.5 h-3.5 w-3.5" />
                Not Interested
              </Button>
              <Button
                type="button"
                size="sm"
                variant={recipe.missingIngredientsDetailed.length === 0 ? "secondary" : "default"}
                onClick={() => addMissingIngredients(recipe)}
                disabled={pendingRecipeId === recipe.recipeId || recipe.missingIngredientsDetailed.length === 0}
              >
                {recipe.missingIngredientsDetailed.length === 0
                  ? "Ready to cook"
                  : pendingRecipeId === recipe.recipeId
                    ? "Adding ingredients..."
                    : "Add Missing Ingredients"}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
