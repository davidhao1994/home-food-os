"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RecommendationList } from "@/features/recipes/recommendation-list";
import type { RecipeRecommendation } from "@/types/domain";

type Props = {
  initialRecommendations: RecipeRecommendation[];
};

type RecipePreferences = {
  favorites: string[];
  hidden: string[];
  disliked: string[];
  recent: string[];
  preferredCuisines: string[];
  preferredMealTypes: Array<"breakfast" | "lunch" | "dinner" | "snack">;
};

type LocalRecipe = {
  id: string;
  name: string;
  cuisine: string;
  cookTime: number;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  proteinType: "chicken" | "beef" | "pork" | "seafood" | "tofu" | "egg" | "plant" | "mixed";
  dietaryTags: string[];
  source: "USER" | "IMPORTED" | "FAMILY_FAVORITES";
};

const DEFAULT_PREFERENCES: RecipePreferences = {
  favorites: [],
  hidden: [],
  disliked: [],
  recent: [],
  preferredCuisines: [],
  preferredMealTypes: []
};

const RECIPE_PREFS_STORAGE_KEY = "home-food-os-recipe-preferences-v1";
const LOCAL_RECIPE_STORAGE_KEY = "home-food-os-local-recipes-v1";

export function RecommendationQueryView({ initialRecommendations }: Props) {
  const [cuisine, setCuisine] = useState("ALL");
  const [mealType, setMealType] = useState("ALL");
  const [proteinType, setProteinType] = useState("ALL");
  const [dietaryTag, setDietaryTag] = useState("ALL");
  const [maxCookTime, setMaxCookTime] = useState("");
  const [proteinTarget, setProteinTarget] = useState("");
  const [refreshSeed, setRefreshSeed] = useState(() => Date.now());
  const [preferences, setPreferences] = useState<RecipePreferences>(DEFAULT_PREFERENCES);
  const [localRecipes, setLocalRecipes] = useState<LocalRecipe[]>([]);
  const [newRecipeName, setNewRecipeName] = useState("");
  const [newRecipeSource, setNewRecipeSource] = useState<LocalRecipe["source"]>("USER");
  const [recipeImportUrl, setRecipeImportUrl] = useState("");
  const [recipePasteText, setRecipePasteText] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedPrefs = localStorage.getItem(RECIPE_PREFS_STORAGE_KEY);
    if (storedPrefs) {
      try {
        const parsed = JSON.parse(storedPrefs) as RecipePreferences;
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      } catch {
        setPreferences(DEFAULT_PREFERENCES);
      }
    }

    const storedRecipes = localStorage.getItem(LOCAL_RECIPE_STORAGE_KEY);
    if (storedRecipes) {
      try {
        const parsed = JSON.parse(storedRecipes) as LocalRecipe[];
        setLocalRecipes(Array.isArray(parsed) ? parsed : []);
      } catch {
        setLocalRecipes([]);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    localStorage.setItem(RECIPE_PREFS_STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    localStorage.setItem(LOCAL_RECIPE_STORAGE_KEY, JSON.stringify(localRecipes));
  }, [localRecipes]);

  const queryKey = useMemo(
    () => [
      "recipe-recommendations",
      cuisine,
      mealType,
      proteinType,
      dietaryTag,
      maxCookTime,
      proteinTarget,
      refreshSeed,
      preferences.favorites.join(","),
      preferences.hidden.join(","),
      preferences.disliked.join(","),
      preferences.recent.join(","),
      preferences.preferredCuisines.join(","),
      preferences.preferredMealTypes.join(",")
    ],
    [
      cuisine,
      mealType,
      proteinType,
      dietaryTag,
      maxCookTime,
      proteinTarget,
      refreshSeed,
      preferences.disliked,
      preferences.favorites,
      preferences.hidden,
      preferences.preferredCuisines,
      preferences.preferredMealTypes,
      preferences.recent
    ]
  );

  const { data, isFetching } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();

      if (cuisine !== "ALL") {
        params.set("cuisine", cuisine);
      }

      if (mealType !== "ALL") {
        params.set("mealType", mealType);
      }

      if (proteinType !== "ALL") {
        params.set("proteinType", proteinType);
      }

      if (dietaryTag !== "ALL") {
        params.set("dietaryTag", dietaryTag);
      }

      if (maxCookTime) {
        params.set("maxCookTime", maxCookTime);
      }

      if (proteinTarget) {
        params.set("proteinTarget", proteinTarget);
      }

      if (preferences.favorites.length > 0) {
        params.set("favorites", preferences.favorites.join(","));
      }

      if (preferences.hidden.length > 0) {
        params.set("hidden", preferences.hidden.join(","));
      }

      if (preferences.disliked.length > 0) {
        params.set("disliked", preferences.disliked.join(","));
      }

      if (preferences.recent.length > 0) {
        params.set("recent", preferences.recent.join(","));
      }

      if (preferences.preferredCuisines.length > 0) {
        params.set("preferredCuisines", preferences.preferredCuisines.join(","));
      }

      if (preferences.preferredMealTypes.length > 0) {
        params.set("preferredMealTypes", preferences.preferredMealTypes.join(","));
      }

      params.set("seed", String(refreshSeed));

      const response = await fetch(`/api/recipes/recommendations?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Unable to fetch recipe recommendations");
      }
      return (await response.json()) as { recommendations: RecipeRecommendation[] };
    },
    initialData: { recommendations: initialRecommendations }
  });

  const sourceCounts = useMemo(() => {
    const counts = {
      builtIn: data.recommendations.filter((recipe) => (recipe.source ?? "BUILT_IN") === "BUILT_IN").length,
      user: localRecipes.filter((recipe) => recipe.source === "USER").length,
      imported: localRecipes.filter((recipe) => recipe.source === "IMPORTED").length,
      family: localRecipes.filter((recipe) => recipe.source === "FAMILY_FAVORITES").length,
      hidden: preferences.hidden.length
    };

    return counts;
  }, [data.recommendations, localRecipes, preferences.hidden.length]);

  const localRecommendations = useMemo<RecipeRecommendation[]>(
    () =>
      localRecipes.map((recipe) => ({
        recipeId: recipe.id,
        name: recipe.name,
        matchScore: 35,
        ingredientMatchPercent: 35,
        source: recipe.source,
        mealType: recipe.mealType,
        difficulty: "medium",
        proteinType: recipe.proteinType,
        dietaryTags: recipe.dietaryTags,
        missingIngredients: [],
        missingIngredientsDetailed: [],
        matchedIngredients: [],
        reason: "Local recipe from your library. Add ingredients to inventory to improve ranking.",
        estimatedCalories: null,
        estimatedProtein: null,
        estimatedFat: null,
        estimatedCarbs: null,
        cookingTime: recipe.cookTime,
        cuisine: recipe.cuisine
      })),
    [localRecipes]
  );

  const mergedRecommendations = useMemo(() => {
    const merged = new Map<string, RecipeRecommendation>();

    [...data.recommendations, ...localRecommendations].forEach((recipe) => {
      const key = `${recipe.name.toLowerCase()}::${recipe.source ?? "BUILT_IN"}`;
      if (!merged.has(key) || (merged.get(key)?.matchScore ?? 0) < recipe.matchScore) {
        merged.set(key, recipe);
      }
    });

    return [...merged.values()].sort((a, b) => b.matchScore - a.matchScore || a.name.localeCompare(b.name));
  }, [data.recommendations, localRecommendations]);

  const toggleFavorite = (recipeId: string) => {
    setPreferences((current) => ({
      ...current,
      favorites: current.favorites.includes(recipeId)
        ? current.favorites.filter((id) => id !== recipeId)
        : [recipeId, ...current.favorites].slice(0, 50)
    }));
  };

  const hideRecipe = (recipeId: string) => {
    setPreferences((current) => ({
      ...current,
      hidden: current.hidden.includes(recipeId) ? current.hidden : [recipeId, ...current.hidden].slice(0, 200),
      disliked: current.disliked.filter((id) => id !== recipeId),
      favorites: current.favorites.filter((id) => id !== recipeId)
    }));
  };

  const markNotInterested = (recipeId: string) => {
    setPreferences((current) => ({
      ...current,
      disliked: current.disliked.includes(recipeId) ? current.disliked : [recipeId, ...current.disliked].slice(0, 200),
      hidden: current.hidden.filter((id) => id !== recipeId),
      favorites: current.favorites.filter((id) => id !== recipeId)
    }));
  };

  const markShown = (recipeIds: string[]) => {
    if (recipeIds.length === 0) {
      return;
    }

    setPreferences((current) => {
      const merged = [...recipeIds, ...current.recent.filter((id) => !recipeIds.includes(id))].slice(0, 25);
      return { ...current, recent: merged };
    });
  };

  const refreshRecommendations = () => {
    setRefreshSeed(Date.now());
  };

  const createLocalRecipe = (source: LocalRecipe["source"], draftName: string) => {
    const trimmed = draftName.trim();
    if (!trimmed) {
      return;
    }

    setLocalRecipes((current) => [
      {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: trimmed,
        cuisine: cuisine !== "ALL" ? cuisine : "Global",
        cookTime: maxCookTime ? Number(maxCookTime) : 25,
        mealType: mealType !== "ALL" ? (mealType as LocalRecipe["mealType"]) : "dinner",
        proteinType: proteinType !== "ALL" ? (proteinType as LocalRecipe["proteinType"]) : "mixed",
        dietaryTags: dietaryTag !== "ALL" ? [dietaryTag] : [],
        source
      },
      ...current
    ]);
  };

  const importFromText = () => {
    const firstLine = recipePasteText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean);

    createLocalRecipe("IMPORTED", firstLine ?? "Imported Recipe");
    setRecipePasteText("");
  };

  const importFromUrl = () => {
    const normalized = recipeImportUrl.trim();
    if (!normalized) {
      return;
    }

    let recipeName = normalized;
    try {
      const parsedUrl = new URL(normalized);
      const slug = parsedUrl.pathname.split("/").filter(Boolean).pop() ?? parsedUrl.hostname;
      recipeName = slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
    } catch {
      recipeName = normalized;
    }

    createLocalRecipe("IMPORTED", recipeName || "Imported Recipe");
    setRecipeImportUrl("");
  };

  const importFromScreenshot = (file: File | null) => {
    if (!file) {
      return;
    }

    const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
    createLocalRecipe("IMPORTED", baseName || "Screenshot Recipe");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-4">
        <h3 className="text-sm font-semibold">Recipe Library Sources</h3>
        <p className="mt-1 text-xs text-muted-foreground">Manage where recipes come from. Local library entries persist in your browser when backend recipe CRUD is unavailable.</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-5">
          <div className="rounded-xl border bg-muted/20 p-2">Built-in: <span className="font-semibold">{sourceCounts.builtIn}</span></div>
          <div className="rounded-xl border bg-muted/20 p-2">User: <span className="font-semibold">{sourceCounts.user}</span></div>
          <div className="rounded-xl border bg-muted/20 p-2">Imported: <span className="font-semibold">{sourceCounts.imported}</span></div>
          <div className="rounded-xl border bg-muted/20 p-2">Family: <span className="font-semibold">{sourceCounts.family}</span></div>
          <div className="rounded-xl border bg-muted/20 p-2">Hidden: <span className="font-semibold">{sourceCounts.hidden}</span></div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <div className="space-y-2 rounded-xl border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Create Manually</p>
            <input
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={newRecipeName}
              placeholder="Recipe name"
              onChange={(event) => setNewRecipeName(event.target.value)}
            />
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={newRecipeSource}
              onChange={(event) => setNewRecipeSource(event.target.value as LocalRecipe["source"])}
            >
              <option value="USER">User Recipes</option>
              <option value="FAMILY_FAVORITES">Family Favorites</option>
            </select>
            <button
              type="button"
              className="h-10 w-full rounded-md border border-primary/30 bg-primary/10 px-3 text-sm font-medium text-primary"
              onClick={() => {
                createLocalRecipe(newRecipeSource, newRecipeName);
                setNewRecipeName("");
              }}
            >
              Save Recipe
            </button>
          </div>

          <div className="space-y-2 rounded-xl border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Import From URL</p>
            <input
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={recipeImportUrl}
              placeholder="https://example.com/recipe"
              onChange={(event) => setRecipeImportUrl(event.target.value)}
            />
            <button
              type="button"
              className="h-10 w-full rounded-md border border-primary/30 bg-primary/10 px-3 text-sm font-medium text-primary"
              onClick={importFromUrl}
            >
              Import URL
            </button>
          </div>

          <div className="space-y-2 rounded-xl border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Paste Text / Screenshot</p>
            <textarea
              className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={recipePasteText}
              placeholder="Paste recipe text"
              onChange={(event) => setRecipePasteText(event.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="h-10 rounded-md border border-primary/30 bg-primary/10 px-3 text-sm font-medium text-primary"
                onClick={importFromText}
              >
                Import Text
              </button>
              <label className="flex h-10 cursor-pointer items-center justify-center rounded-md border border-input bg-background px-3 text-sm">
                Upload Image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => importFromScreenshot(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
        <select
          className="h-11 rounded-md border border-input bg-background px-3"
          value={cuisine}
          onChange={(event) => setCuisine(event.target.value)}
        >
          <option value="ALL">All cuisines</option>
          <option value="Chinese">Chinese</option>
          <option value="Japanese">Japanese</option>
          <option value="Korean">Korean</option>
          <option value="American">American</option>
          <option value="Mediterranean">Mediterranean</option>
        </select>
        <select className="h-11 rounded-md border border-input bg-background px-3" value={mealType} onChange={(event) => setMealType(event.target.value)}>
          <option value="ALL">All meal types</option>
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
          <option value="snack">Snack</option>
        </select>
        <select className="h-11 rounded-md border border-input bg-background px-3" value={proteinType} onChange={(event) => setProteinType(event.target.value)}>
          <option value="ALL">All protein types</option>
          <option value="chicken">Chicken</option>
          <option value="beef">Beef</option>
          <option value="pork">Pork</option>
          <option value="seafood">Seafood</option>
          <option value="tofu">Tofu</option>
          <option value="egg">Egg</option>
          <option value="plant">Plant</option>
          <option value="mixed">Mixed</option>
        </select>
        <select className="h-11 rounded-md border border-input bg-background px-3" value={dietaryTag} onChange={(event) => setDietaryTag(event.target.value)}>
          <option value="ALL">All dietary tags</option>
          <option value="vegetarian">Vegetarian</option>
          <option value="high-protein">High Protein</option>
          <option value="quick">Quick</option>
          <option value="high-fiber">High Fiber</option>
        </select>
        <input
          className="h-11 rounded-md border border-input bg-background px-3"
          type="number"
          min="5"
          step="5"
          value={maxCookTime}
          placeholder="Max cooking time (min)"
          onChange={(event) => setMaxCookTime(event.target.value)}
        />
        <input
          className="h-11 rounded-md border border-input bg-background px-3"
          type="number"
          min="0"
          step="1"
          value={proteinTarget}
          placeholder="Protein target per recipe (g)"
          onChange={(event) => setProteinTarget(event.target.value)}
        />
      </div>

      <RecommendationList
        recommendations={mergedRecommendations}
        preferences={preferences}
        onToggleFavorite={toggleFavorite}
        onHide={hideRecipe}
        onNotInterested={markNotInterested}
        onRefresh={refreshRecommendations}
        onMarkShown={markShown}
        isLoading={isFetching}
      />
    </div>
  );
}
