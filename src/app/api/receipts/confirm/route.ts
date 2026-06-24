import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveHouseholdIdForUser } from "@/services/family-demo.service";
import { inferReceiptItemDetails } from "@/services/ocr.service";
import { jsonResponse } from "@/utils/serialize";

const confirmReceiptSchema = z.object({
  receiptUploadId: z.string().uuid(),
  reviewedLines: z
    .array(
      z.object({
        id: z.string().uuid(),
        selected: z.boolean(),
        extractedName: z.string().trim().min(1).max(160),
        extractedQuantity: z.number().positive().nullable(),
        extractedUnit: z.string().trim().max(40).nullable(),
        extractedPrice: z.number().nonnegative().nullable()
      })
    )
    .min(1)
});

export async function POST(request: Request) {
  const user = await requireUser();
  const householdId = await resolveHouseholdIdForUser(user.id);
  const payload = await request.json().catch(() => null);
  const parsed = confirmReceiptSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonResponse(
      {
        error: "Invalid request payload",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const receipt = await prisma.receiptUpload.findFirst({
    where: {
      id: parsed.data.receiptUploadId,
      userId: user.id
    }
  });

  if (!receipt) {
    return jsonResponse({ error: "Receipt not found" }, { status: 404 });
  }

  const selected = parsed.data.reviewedLines.filter((line) => line.selected);
  if (selected.length === 0) {
    return jsonResponse({ error: "Select at least one line to add into inventory" }, { status: 400 });
  }

  const selectedIds = selected.map((line) => line.id);

  const lines = await prisma.ocrResult.findMany({
    where: {
      receiptUploadId: receipt.id,
      id: { in: selectedIds }
    }
  });

  const selectedById = new Map(selected.map((line) => [line.id, line]));

  await prisma.$transaction(async (tx) => {
    for (const line of parsed.data.reviewedLines) {
      await tx.ocrResult.updateMany({
        where: { id: line.id, receiptUploadId: receipt.id },
        data: {
          extractedName: line.extractedName,
          extractedQuantity: line.extractedQuantity,
          extractedUnit: line.extractedUnit,
          extractedPrice: line.extractedPrice,
          lineStatus: line.selected ? "CONFIRMED" : "REJECTED"
        }
      });
    }

    await tx.inventoryItem.createMany({
      data: lines.map((line) => {
        const reviewed = selectedById.get(line.id);
        const name = reviewed?.extractedName ?? line.extractedName;
        const details = inferReceiptItemDetails(name);
        const price = reviewed?.extractedPrice ?? (line.extractedPrice ? Number(line.extractedPrice) : null);

        return {
          userId: user.id,
          householdId,
          name,
          quantity: reviewed?.extractedQuantity ?? (line.extractedQuantity ? Number(line.extractedQuantity) : 1),
          unit: reviewed?.extractedUnit ?? line.extractedUnit ?? "item",
          unitPrice: price,
          category: details.category,
          storageLocation: details.storageLocation,
          purchaseDate: new Date(),
          notes: `Added from ${receipt.retailer ?? "receipt"} receipt ${receipt.id}`
        };
      })
    });

    await tx.receiptUpload.update({
      where: { id: receipt.id },
      data: { status: "COMPLETED", processedAt: new Date() }
    });
  });

  return jsonResponse({ addedCount: selected.length });
}