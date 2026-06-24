import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveHouseholdIdForUser } from "@/services/family-demo.service";
import { inferReceiptItemDetails } from "@/services/ocr.service";
import { getSuggestedExpirationDate } from "@/utils/food";
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
        extractedPrice: z.number().nonnegative().nullable(),
        mergeStrategy: z.enum(["MERGE", "CREATE_NEW"]).optional().default("CREATE_NEW"),
        existingInventoryItemId: z.string().uuid().nullable().optional()
      })
    )
    .min(1)
});

function chooseSoonerDate(left: Date | null, right: Date | null) {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return left.getTime() <= right.getTime() ? left : right;
}

function buildReceiptImportNotes(input: {
  existingNotes?: string | null;
  retailer?: string | null;
  receiptId: string;
  rawLine?: string | null;
  extractedName: string;
}) {
  const segments = [
    `${input.existingNotes ? `${input.existingNotes}\n` : ""}Added from ${input.retailer ?? "receipt"} receipt ${input.receiptId}`,
    input.rawLine ? `OCR_RAW: ${input.rawLine}` : null,
    `OCR_NORMALIZED: ${input.extractedName}`
  ].filter((value): value is string => Boolean(value));

  return segments.join("\n");
}

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

  if (receipt.status === "COMPLETED") {
    return jsonResponse({ addedCount: 0, createdCount: 0, mergedCount: 0, alreadyProcessed: true });
  }

  const selected = parsed.data.reviewedLines.filter((line) => line.selected);
  if (selected.length === 0) {
    return jsonResponse({ error: "Select at least one line to add into inventory" }, { status: 400 });
  }

  const selectedIds = selected.map((line) => line.id);
  const mergeTargetIds = selected
    .filter((line) => line.mergeStrategy === "MERGE" && line.existingInventoryItemId)
    .map((line) => line.existingInventoryItemId as string);

  const lines = await prisma.ocrResult.findMany({
    where: {
      receiptUploadId: receipt.id,
      id: { in: selectedIds }
    }
  });

  const selectedById = new Map(selected.map((line) => [line.id, line]));

  const result = await prisma.$transaction(async (tx) => {
    const lockResult = await tx.receiptUpload.updateMany({
      where: {
        id: receipt.id,
        userId: user.id,
        status: { not: "COMPLETED" }
      },
      data: {
        status: "PROCESSING"
      }
    });

    if (lockResult.count === 0) {
      return { addedCount: 0, createdCount: 0, mergedCount: 0, alreadyProcessed: true as const };
    }

    const mergeTargets = mergeTargetIds.length
      ? await tx.inventoryItem.findMany({
          where: {
            id: { in: mergeTargetIds },
            userId: user.id
          }
        })
      : [];
    const mergeTargetsById = new Map(mergeTargets.map((item) => [item.id, item]));
    const itemsToCreate: Array<{
      userId: string;
      householdId: string | null;
      name: string;
      quantity: number;
      unit: string;
      unitPrice: number | null;
      category: ReturnType<typeof inferReceiptItemDetails>["category"];
      storageLocation: ReturnType<typeof inferReceiptItemDetails>["storageLocation"];
      purchaseDate: Date;
      expirationDate: Date | null;
      notes: string;
    }> = [];
    let createdCount = 0;
    let mergedCount = 0;

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

    for (const line of lines) {
      const reviewed = selectedById.get(line.id);
      if (!reviewed) {
        continue;
      }

      const name = reviewed.extractedName ?? line.extractedName;
      const details = inferReceiptItemDetails(name);
      const price = reviewed.extractedPrice ?? (line.extractedPrice ? Number(line.extractedPrice) : null);
      const quantity = reviewed.extractedQuantity ?? (line.extractedQuantity ? Number(line.extractedQuantity) : 1);
      const unit = reviewed.extractedUnit ?? line.extractedUnit ?? "item";
      const suggestedExpirationDate = getSuggestedExpirationDate(details.category, new Date());
      const mergeTarget =
        reviewed.mergeStrategy === "MERGE" && reviewed.existingInventoryItemId
          ? mergeTargetsById.get(reviewed.existingInventoryItemId)
          : null;

      if (mergeTarget) {
        const nextExpirationDate = chooseSoonerDate(mergeTarget.expirationDate, suggestedExpirationDate);
        const updatedItem = await tx.inventoryItem.update({
          where: { id: mergeTarget.id },
          data: {
            quantity: Number(mergeTarget.quantity) + quantity,
            unitPrice: price ?? mergeTarget.unitPrice,
            purchaseDate: new Date(),
            expirationDate: nextExpirationDate,
            notes: buildReceiptImportNotes({
              existingNotes: mergeTarget.notes,
              retailer: receipt.retailer,
              receiptId: receipt.id,
              rawLine: line.rawLine,
              extractedName: name
            })
          }
        });

        mergeTargetsById.set(mergeTarget.id, updatedItem);
        mergedCount += 1;
        continue;
      }

      itemsToCreate.push({
        userId: user.id,
        householdId,
        name,
        quantity,
        unit,
        unitPrice: price,
        category: details.category,
        storageLocation: details.storageLocation,
        purchaseDate: new Date(),
        expirationDate: suggestedExpirationDate,
        notes: buildReceiptImportNotes({
          retailer: receipt.retailer,
          receiptId: receipt.id,
          rawLine: line.rawLine,
          extractedName: name
        })
      });
      createdCount += 1;
    }

    if (itemsToCreate.length > 0) {
      await tx.inventoryItem.createMany({
        data: itemsToCreate
      });
    }

    await tx.receiptUpload.update({
      where: { id: receipt.id },
      data: { status: "COMPLETED", processedAt: new Date() }
    });

    return { addedCount: selected.length, createdCount, mergedCount, alreadyProcessed: false as const };
  });

  return jsonResponse(result);
}