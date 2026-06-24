import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonResponse } from "@/utils/serialize";

const consumeSchema = z.object({
  id: z.string().uuid(),
  quantity: z.number().positive(),
  note: z.string().trim().max(160).nullable().optional()
});

export async function POST(request: Request) {
  const user = await requireUser();
  const payload = await request.json().catch(() => null);
  const parsed = consumeSchema.safeParse(payload);

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
  const item = await prisma.inventoryItem.findFirst({ where: { id: body.id, userId: user.id } });

  if (!item) {
    return jsonResponse({ error: "Item not found" }, { status: 404 });
  }

  const currentQuantity = Number(item.quantity);
  const nextQuantity = Math.max(0, currentQuantity - body.quantity);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.inventoryConsumption.create({
      data: {
        itemId: item.id,
        userId: user.id,
        quantity: body.quantity,
        note: body.note ?? null
      }
    });

    return tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        quantity: nextQuantity,
        consumptionRatePerDay:
          item.purchaseDate && nextQuantity >= 0
            ? (() => {
                const elapsedDays = Math.max(
                  1,
                  Math.round((Date.now() - item.purchaseDate.getTime()) / (24 * 60 * 60 * 1000))
                );
                return (currentQuantity - nextQuantity) / elapsedDays;
              })()
            : item.consumptionRatePerDay
      }
    });
  });

  return jsonResponse({
    item: {
      ...updated,
      quantity: Number(updated.quantity),
      lowStockThreshold: Number(updated.lowStockThreshold),
      consumptionRatePerDay: updated.consumptionRatePerDay ? Number(updated.consumptionRatePerDay) : null,
      unitPrice: updated.unitPrice ? Number(updated.unitPrice) : null,
      purchaseDate: updated.purchaseDate?.toISOString() ?? null,
      expirationDate: updated.expirationDate?.toISOString() ?? null
    }
  });
}
