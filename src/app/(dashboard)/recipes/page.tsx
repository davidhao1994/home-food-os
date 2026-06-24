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
    <div className="relative z-0 space-y-4 pb-24 md:pb-0">
      <PageHeader title="Smart Recipe Recommendations / 智能菜谱推荐" subtitle="Cook tonight, use expiring foods, and discover quick personalized ideas. / 今晚吃什么、消耗临期食材、快速找到更合适的菜谱。" />
      <RecommendationQueryView initialRecommendations={recommendations} />
    </div>
  );
}
