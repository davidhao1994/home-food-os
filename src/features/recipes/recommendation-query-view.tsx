"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RecommendationList } from "@/features/recipes/recommendation-list";

type Recommendation = {
  recipeId: string;
  name: string;
  matchScore: number;
  ingredientMatchPercent: number;
  missingIngredients: string[];
  estimatedCalories: number | null;
  estimatedProtein: number | null;
  estimatedFat: number | null;
  estimatedCarbs: number | null;
  cookingTime: number;
  cuisine?: string;
};

type Props = {
  initialRecommendations: Recommendation[];
};

export function RecommendationQueryView({ initialRecommendations }: Props) {
  const [cuisine, setCuisine] = useState("ALL");
  const [maxCookTime, setMaxCookTime] = useState("");
  const [proteinTarget, setProteinTarget] = useState("");

  const queryKey = useMemo(
    () => ["recipe-recommendations", cuisine, maxCookTime, proteinTarget],
    [cuisine, maxCookTime, proteinTarget]
  );

  const { data } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();

      if (cuisine !== "ALL") {
        params.set("cuisine", cuisine);
      }

      if (maxCookTime) {
        params.set("maxCookTime", maxCookTime);
      }

      if (proteinTarget) {
        params.set("proteinTarget", proteinTarget);
      }

      const response = await fetch(`/api/recipes/recommendations?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Unable to fetch recipe recommendations");
      }
      return (await response.json()) as { recommendations: Recommendation[] };
    },
    initialData: { recommendations: initialRecommendations }
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
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

      <RecommendationList recommendations={data.recommendations} />
    </div>
  );
}
