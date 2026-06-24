import { ItemCategory } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveHouseholdIdForUser } from "@/services/family-demo.service";
import { normalizeFoodName } from "@/utils/food";
import { jsonResponse } from "@/utils/serialize";

const bulkShoppingSchema = z.object({
  source: z.string().trim().max(120).optional(),
  ingredients: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        quantity: z.number().positive().nullable().optional(),
        unit: z.string().trim().min(1).max(40).nullable().optional(),
        category: z.nativeEnum(ItemCategory).nullable().optional()
      })
    )
    .min(1)
    .max(24)
});

export async function POST(request: Request) {
  const user = await requireUser();
  const householdId = await resolveHouseholdIdForUser(user.id);
  const payload = await request.json().catch(() => null);
  const parsed = bulkShoppingSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonResponse(
      {
        error: "Invalid request payload",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const pendingItems = await prisma.shoppingListItem.findMany({
    where: { userId: user.id, isPurchased: false }
  });

  const pendingByKey = new Map(pendingItems.map((item) => [normalizeFoodName(item.name), item]));
  let createdCount = 0;
  let updatedCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const ingredient of parsed.data.ingredients) {
      const key = normalizeFoodName(ingredient.name);
      const existing = pendingByKey.get(key);
      const nextQuantity = ingredient.quantity ?? 1;
      const nextUnit = ingredient.unit ?? existing?.unit ?? "item";
      const nextCategory = ingredient.category ?? existing?.category ?? ItemCategory.OTHER;

      if (existing && normalizeFoodName(existing.unit) === normalizeFoodName(nextUnit)) {
        const updated = await tx.shoppingListItem.update({
          where: { id: existing.id },
          data: {
            quantity: Number(existing.quantity) + nextQuantity,
            category: nextCategory
          }
        });

        pendingByKey.set(key, updated);
        updatedCount += 1;
        continue;
      }

      const created = await tx.shoppingListItem.create({
        data: {
          userId: user.id,
          householdId,
          name: ingredient.name,
          quantity: nextQuantity,
          unit: nextUnit,
          category: nextCategory
        }
      });

      pendingByKey.set(key, created);
      createdCount += 1;
    }
  });

  return jsonResponse({
    createdCount,
    updatedCount,
    source: parsed.data.source ?? null
  });
}