"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { RecipeRecommendation } from "@/types/domain";

type Props = {
  recommendations: RecipeRecommendation[];
};

export function RecommendationList({ recommendations }: Props) {
  const [pendingRecipeId, setPendingRecipeId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);

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

  if (recommendations.length === 0) {
    return <p className="text-sm text-muted-foreground">No recipes available yet. Seed or add recipes to get recommendations.</p>;
  }

  return (
    <div className="space-y-3">
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
      {recommendations.map((recipe) => (
        <div key={recipe.recipeId} className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold">{recipe.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">Cuisine: {recipe.cuisine ?? "Unknown"}</p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Match: {recipe.ingredientMatchPercent}%</span>
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

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">Add missing ingredients to your shopping list in one tap.</p>
            <Button
              type="button"
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
      ))}
    </div>
  );
}
