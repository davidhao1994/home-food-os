import { PageHeader } from "@/components/shared/page-header";
import { RecommendationQueryView } from "@/features/recipes/recommendation-query-view";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureBaseRecipes } from "@/services/recipe-catalog.service";
import { buildRecipeRecommendations } from "@/services/recommendation.service";

export default async function RecipesPage() {
  const user = await requireUser();

  const [inventory, recipes] = await Promise.all([
    prisma.inventoryItem.findMany({ where: { userId: user.id } }),
    ensureBaseRecipes(prisma)
  ]);

  const recommendations = buildRecipeRecommendations(inventory, recipes);

  return (
    <div>
      <PageHeader title="Smart Recipe Recommendations" subtitle="Filter by cuisine, cook time, and protein target with ingredient match scoring." />
      <RecommendationQueryView initialRecommendations={recommendations} />
    </div>
  );
}
