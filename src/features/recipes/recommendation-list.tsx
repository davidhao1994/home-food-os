type RecipeRecommendationDto = {
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
  recommendations: RecipeRecommendationDto[];
};

export function RecommendationList({ recommendations }: Props) {
  if (recommendations.length === 0) {
    return <p className="text-sm text-muted-foreground">No recipes available yet. Seed or add recipes to get recommendations.</p>;
  }

  return (
    <div className="space-y-3">
      {recommendations.map((recipe) => (
        <div key={recipe.recipeId} className="rounded-xl border bg-card p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">{recipe.name}</h3>
            <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{recipe.ingredientMatchPercent}% match</span>
          </div>
          <p className="text-xs text-muted-foreground">Cuisine: {recipe.cuisine ?? "Unknown"}</p>
          <p className="text-sm text-muted-foreground">Missing: {recipe.missingIngredients.length ? recipe.missingIngredients.join(", ") : "None"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Calories: {recipe.estimatedCalories ?? "N/A"} • Protein: {recipe.estimatedProtein ?? "N/A"} g • Carbs: {recipe.estimatedCarbs ?? "N/A"} g • Fat: {recipe.estimatedFat ?? "N/A"} g • Cook time: {recipe.cookingTime} min
          </p>
        </div>
      ))}
    </div>
  );
}
