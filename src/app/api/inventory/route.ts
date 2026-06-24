import { ItemCategory, StorageLocation } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveHouseholdIdForUser } from "@/services/family-demo.service";
import { jsonResponse } from "@/utils/serialize";

function parseDateField(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00`);
  }

  return new Date(value);
}

const dateFieldSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (!value) {
      return null;
    }

    const parsed = parseDateField(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  });

const createInventorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  brand: z.string().trim().max(80).nullable().optional(),
  barcode: z.string().trim().max(80).nullable().optional(),
  quantity: z.number().positive(),
  unit: z.string().trim().min(1).max(40),
  lowStockThreshold: z.number().positive().optional().default(1),
  consumptionRatePerDay: z.number().nonnegative().nullable().optional(),
  unitPrice: z.number().nonnegative().nullable().optional(),
  category: z.nativeEnum(ItemCategory),
  purchaseDate: dateFieldSchema,
  expirationDate: dateFieldSchema,
  storageLocation: z.nativeEnum(StorageLocation),
  notes: z.string().trim().max(500).nullable().optional()
});

const updateInventorySchema = createInventorySchema.extend({
  id: z.string().uuid()
});

const deleteInventorySchema = z.object({
  id: z.string().uuid()
});

export async function GET() {
  const user = await requireUser();

  const items = await prisma.inventoryItem.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" }
  });

  return jsonResponse({
    items: items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      lowStockThreshold: Number(item.lowStockThreshold),
      consumptionRatePerDay: item.consumptionRatePerDay ? Number(item.consumptionRatePerDay) : null,
      unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
      purchaseDate: item.purchaseDate?.toISOString() ?? null,
      expirationDate: item.expirationDate?.toISOString() ?? null
    }))
  });
}

export async function POST(request: Request) {
  const user = await requireUser();
  const householdId = await resolveHouseholdIdForUser(user.id);
  const payload = await request.json().catch(() => null);
  const parsed = createInventorySchema.safeParse(payload);

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

  const item = await prisma.inventoryItem.create({
    data: {
      userId: user.id,
      householdId,
      name: body.name,
      brand: body.brand ?? null,
      barcode: body.barcode ?? null,
      quantity: body.quantity,
      unit: body.unit,
      lowStockThreshold: body.lowStockThreshold,
      consumptionRatePerDay: body.consumptionRatePerDay,
      unitPrice: body.unitPrice,
      category: body.category,
      purchaseDate: body.purchaseDate,
      expirationDate: body.expirationDate,
      storageLocation: body.storageLocation,
      notes: body.notes ?? null
    }
  });

  return jsonResponse(
    {
      item: {
        ...item,
        quantity: Number(item.quantity),
        lowStockThreshold: Number(item.lowStockThreshold),
        consumptionRatePerDay: item.consumptionRatePerDay ? Number(item.consumptionRatePerDay) : null,
        unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
        purchaseDate: item.purchaseDate?.toISOString() ?? null,
        expirationDate: item.expirationDate?.toISOString() ?? null
      }
    },
    { status: 201 }
  );
}

export async function PATCH(request: Request) {
  const user = await requireUser();
  const payload = await request.json().catch(() => null);
  const parsed = updateInventorySchema.safeParse(payload);

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

  const item = await prisma.inventoryItem.updateMany({
    where: {
      id: body.id,
      userId: user.id
    },
    data: {
      name: body.name,
      brand: body.brand ?? null,
      barcode: body.barcode ?? null,
      quantity: body.quantity,
      unit: body.unit,
      lowStockThreshold: body.lowStockThreshold,
      consumptionRatePerDay: body.consumptionRatePerDay,
      unitPrice: body.unitPrice,
      category: body.category,
      purchaseDate: body.purchaseDate,
      expirationDate: body.expirationDate,
      storageLocation: body.storageLocation,
      notes: body.notes ?? null
    }
  });

  if (item.count === 0) {
    return jsonResponse({ error: "Item not found" }, { status: 404 });
  }

  const updatedItem = await prisma.inventoryItem.findFirst({
    where: {
      id: body.id,
      userId: user.id
    }
  });

  return jsonResponse({
    item: {
      ...updatedItem,
      quantity: Number(updatedItem?.quantity),
      lowStockThreshold: Number(updatedItem?.lowStockThreshold),
      consumptionRatePerDay: updatedItem?.consumptionRatePerDay ? Number(updatedItem.consumptionRatePerDay) : null,
      unitPrice: updatedItem?.unitPrice ? Number(updatedItem.unitPrice) : null,
      purchaseDate: updatedItem?.purchaseDate?.toISOString() ?? null,
      expirationDate: updatedItem?.expirationDate?.toISOString() ?? null
    }
  });
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  const { searchParams } = new URL(request.url);
  const parsed = deleteInventorySchema.safeParse({ id: searchParams.get("id") });

  if (!parsed.success) {
    return jsonResponse({ error: "A valid id query parameter is required" }, { status: 400 });
  }

  await prisma.inventoryItem.deleteMany({
    where: { id: parsed.data.id, userId: user.id }
  });

  return jsonResponse({ ok: true });
}
