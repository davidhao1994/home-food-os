import { ReceiptStatus } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runReceiptOcrFromBase64 } from "@/services/ocr.service";
import { buildReceiptReviewLines } from "@/services/receipt-review.service";
import { jsonResponse } from "@/utils/serialize";

const processReceiptSchema = z.object({
  receiptUploadId: z.string().uuid(),
  imageData: z.string().trim().min(100)
});

function serializeLines(
  lines: Array<{
    id: string;
    rawLine: string | null;
    extractedName: string;
    extractedQuantity: unknown;
    extractedUnit: string | null;
    extractedPrice: unknown;
    confidence: unknown;
    lineStatus: string;
  }>
) {
  return lines.map((line) => ({
    ...line,
    extractedQuantity: line.extractedQuantity ? Number(line.extractedQuantity) : null,
    extractedPrice: line.extractedPrice ? Number(line.extractedPrice) : null,
    confidence: line.confidence ? Number(line.confidence) : null
  }));
}

async function buildReceiptPayload(receiptUploadId: string, userId: string) {
  const receipt = await prisma.receiptUpload.findUnique({
    where: { id: receiptUploadId },
    include: {
      ocrResults: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!receipt) {
    return null;
  }

  const serializedLines = serializeLines(receipt.ocrResults);
  const inventoryItems = serializedLines.length
    ? await prisma.inventoryItem.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          quantity: true,
          unit: true,
          category: true,
          storageLocation: true,
          expirationDate: true
        }
      })
    : [];

  return {
    receiptUploadId: receipt.id,
    status: receipt.status,
    retailer: receipt.retailer ?? "unknown",
    processedAt: receipt.processedAt,
    rawText: receipt.rawText,
    ocrResults: buildReceiptReviewLines(
      serializedLines,
      inventoryItems.map((item) => ({
        ...item,
        quantity: Number(item.quantity)
      }))
    )
  };
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireUser();
  const payload = await request.json().catch(() => null);
  const parsed = processReceiptSchema.safeParse(payload);

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

  if (receipt.status === ReceiptStatus.REVIEW_REQUIRED || receipt.status === ReceiptStatus.COMPLETED) {
    const existing = await buildReceiptPayload(receipt.id, user.id);
    return jsonResponse(existing, { status: 200 });
  }

  if (receipt.status === ReceiptStatus.PROCESSING) {
    const processing = await buildReceiptPayload(receipt.id, user.id);
    return jsonResponse(processing, { status: 202 });
  }

  await prisma.receiptUpload.update({
    where: { id: receipt.id },
    data: {
      status: ReceiptStatus.PROCESSING,
      processedAt: null
    }
  });

  console.info("[receipt-ocr] OCR started", { receiptUploadId: receipt.id, userId: user.id });

  try {
    const ocr = await runReceiptOcrFromBase64(parsed.data.imageData);
    console.info("[receipt-ocr] OCR completed", {
      receiptUploadId: receipt.id,
      provider: ocr.provider,
      lineCount: ocr.lines.length
    });

    const status = ocr.lines.length > 0 ? ReceiptStatus.REVIEW_REQUIRED : ReceiptStatus.COMPLETED;
    console.info("[receipt-ocr] OCR parsing completed", {
      receiptUploadId: receipt.id,
      parsedLines: ocr.lines.length,
      nextStatus: status
    });

    await prisma.$transaction(async (tx) => {
      await tx.ocrResult.deleteMany({ where: { receiptUploadId: receipt.id } });

      if (ocr.lines.length > 0) {
        await tx.ocrResult.createMany({
          data: ocr.lines.map((line) => ({
            receiptUploadId: receipt.id,
            rawLine: line.rawLine,
            extractedName: line.extractedName,
            extractedQuantity: line.extractedQuantity,
            extractedUnit: line.extractedUnit,
            extractedPrice: line.extractedPrice,
            confidence: line.confidence,
            lineStatus: line.lineStatus
          }))
        });
      }

      await tx.receiptUpload.update({
        where: { id: receipt.id },
        data: {
          status,
          processedAt: new Date(),
          rawText: ocr.rawText,
          retailer: ocr.retailer
        }
      });
    });

    console.info("[receipt-ocr] database updated", {
      receiptUploadId: receipt.id,
      status
    });

    const done = await buildReceiptPayload(receipt.id, user.id);
    return jsonResponse(done, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown OCR error";

    console.error("[receipt-ocr] OCR failed", {
      receiptUploadId: receipt.id,
      message: errorMessage
    });

    await prisma.receiptUpload.update({
      where: { id: receipt.id },
      data: {
        status: ReceiptStatus.FAILED,
        processedAt: new Date()
      }
    });

    const failed = await buildReceiptPayload(receipt.id, user.id);
    return jsonResponse(
      {
        ...failed,
        error: `Receipt OCR failed: ${errorMessage}`
      },
      { status: 422 }
    );
  }
}
