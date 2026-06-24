import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { getAssistantResponse } from "@/services/ai.service";
import { ensureBaseRecipes } from "@/services/recipe-catalog.service";
import { buildRecipeRecommendations } from "@/services/recommendation.service";
import { jsonResponse } from "@/utils/serialize";

const chatSchema = z.object({
  prompt: z.string().trim().min(1).max(1200)
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rate = checkRateLimit(`ai-chat:${ip}`, 30, 60_000);

  if (!rate.ok) {
    return jsonResponse({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const user = await requireUser();
  const payload = await request.json().catch(() => null);
  const parsed = chatSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonResponse(
      {
        error: "Invalid request payload",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const body = parsed.data;

  const [inventory, shopping, recipes] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { userId: user.id },
      select: { name: true, category: true, expirationDate: true, quantity: true, unit: true }
    }),
    prisma.shoppingListItem.findMany({ where: { userId: user.id }, select: { name: true, quantity: true, unit: true, isPurchased: true } }),
    ensureBaseRecipes(prisma)
  ]);
  const recommendations = buildRecipeRecommendations(
    inventory.map((item) => ({ ...item, userId: user.id, quantity: Number(item.quantity) })) as never,
    recipes
  );
  const output = await getAssistantResponse({
    userPrompt: body.prompt,
    inventory: inventory.map((item) => ({ ...item, quantity: Number(item.quantity) })),
    shopping: shopping.map((item) => ({ ...item, quantity: Number(item.quantity) })),
    recommendations
  });

  await prisma.aiConversation.create({
    data: {
      userId: user.id,
      prompt: body.prompt,
      response: output.text
    }
  });

  return jsonResponse({ response: output.text });
}
