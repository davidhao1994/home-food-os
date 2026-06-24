import { ItemCategory, ShoppingPriority } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveHouseholdIdForUser } from "@/services/family-demo.service";
import { getDefaultStorageLocation, getSuggestedExpirationDate } from "@/utils/food";
import { jsonResponse } from "@/utils/serialize";

const createShoppingSchema = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.number().positive(),
  unit: z.string().trim().min(1).max(40),
  category: z.nativeEnum(ItemCategory),
  priority: z.nativeEnum(ShoppingPriority).optional().default(ShoppingPriority.MEDIUM),
  estimatedPrice: z.number().nonnegative().nullable().optional()
});

const updateShoppingSchema = createShoppingSchema.extend({
  id: z.string().uuid()
});

const purchaseShoppingSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["purchase", "purchase_and_move"])
});

const deleteShoppingSchema = z.object({
  id: z.string().uuid()
});

export async function GET() {
  const user = await requireUser();

  const items = await prisma.shoppingListItem.findMany({
    where: { userId: user.id },
    orderBy: [{ isPurchased: "asc" }, { createdAt: "desc" }]
  });

  return jsonResponse({
    items: items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      estimatedPrice: item.estimatedPrice ? Number(item.estimatedPrice) : null
    }))
  });
}

export async function POST(request: Request) {
  const user = await requireUser();
  const householdId = await resolveHouseholdIdForUser(user.id);
  const payload = await request.json().catch(() => null);
  const parsed = createShoppingSchema.safeParse(payload);

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

  const item = await prisma.shoppingListItem.create({
    data: {
      userId: user.id,
      householdId,
      name: body.name,
      quantity: body.quantity,
      unit: body.unit,
      category: body.category,
      priority: body.priority,
      estimatedPrice: body.estimatedPrice
    }
  });

  return jsonResponse(
    {
      item: {
        ...item,
        quantity: Number(item.quantity),
        estimatedPrice: item.estimatedPrice ? Number(item.estimatedPrice) : null
      }
    },
    { status: 201 }
  );
}

export async function PATCH(request: Request) {
  const user = await requireUser();
  const payload = await request.json().catch(() => null);
  const parsed = payload && typeof payload === "object" && "action" in payload
    ? purchaseShoppingSchema.safeParse(payload)
    : updateShoppingSchema.safeParse(payload);

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

  if ("name" in body) {
    const result = await prisma.shoppingListItem.updateMany({
      where: { id: body.id, userId: user.id },
      data: {
        name: body.name,
        quantity: body.quantity,
        unit: body.unit,
        category: body.category,
        priority: body.priority,
        estimatedPrice: body.estimatedPrice
      }
    });

    if (result.count === 0) {
      return jsonResponse({ error: "item not found" }, { status: 404 });
    }

    const updatedItem = await prisma.shoppingListItem.findFirst({ where: { id: body.id, userId: user.id } });

    return jsonResponse({
      item: {
        ...updatedItem,
        quantity: Number(updatedItem?.quantity),
        estimatedPrice: updatedItem?.estimatedPrice ? Number(updatedItem.estimatedPrice) : null
      }
    });
  }

  const existing = await prisma.shoppingListItem.findFirst({
    where: { id: body.id, userId: user.id }
  });

  if (!existing) {
    return jsonResponse({ error: "item not found" }, { status: 404 });
  }

  const item = await prisma.shoppingListItem.update({
    where: { id: body.id },
    data: {
      isPurchased: true,
      purchasedAt: new Date()
    }
  });

  if (body.action === "purchase_and_move") {
    const expirationDate = getSuggestedExpirationDate(existing.category, new Date());

    await prisma.inventoryItem.create({
      data: {
        userId: user.id,
        householdId: existing.householdId,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        storageLocation: getDefaultStorageLocation(item.category),
        purchaseDate: new Date(),
        expirationDate,
        notes: "Added from shopping list"
      }
    });
  }

  return jsonResponse({
    item: {
      ...item,
      quantity: Number(item.quantity),
      estimatedPrice: item.estimatedPrice ? Number(item.estimatedPrice) : null
    }
  });
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  const { searchParams } = new URL(request.url);
  const parsed = deleteShoppingSchema.safeParse({ id: searchParams.get("id") });

  if (!parsed.success) {
    return jsonResponse({ error: "A valid id query parameter is required" }, { status: 400 });
  }

  await prisma.shoppingListItem.deleteMany({ where: { id: parsed.data.id, userId: user.id } });

  return jsonResponse({ ok: true });
}
