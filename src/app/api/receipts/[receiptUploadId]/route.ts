import { ReceiptStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonResponse } from "@/utils/serialize";

const DEFAULT_STALE_MS = 120_000;

function parseStaleMs() {
  const configured = Number(process.env.RECEIPT_PROCESSING_STALE_MS ?? DEFAULT_STALE_MS);
  if (!Number.isFinite(configured)) {
    return DEFAULT_STALE_MS;
  }

  return Math.max(30_000, Math.min(900_000, Math.trunc(configured)));
}

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

export async function GET(_request: Request, context: { params: Promise<{ receiptUploadId: string }> }) {
  const user = await requireUser();
  const { receiptUploadId } = await context.params;

  const receipt = await prisma.receiptUpload.findFirst({
    where: {
      id: receiptUploadId,
      userId: user.id
    },
    include: {
      ocrResults: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!receipt) {
    return jsonResponse({ error: "Receipt not found" }, { status: 404 });
  }

  if (receipt.status === ReceiptStatus.PROCESSING) {
    const staleMs = parseStaleMs();
    const elapsedMs = Date.now() - receipt.uploadedAt.getTime();

    if (elapsedMs > staleMs) {
      console.error("[receipt-ocr] OCR failed", {
        receiptUploadId: receipt.id,
        message: "Processing exceeded stale threshold"
      });

      const failed = await prisma.receiptUpload.update({
        where: { id: receipt.id },
        data: {
          status: ReceiptStatus.FAILED,
          processedAt: new Date()
        },
        include: {
          ocrResults: {
            orderBy: { createdAt: "asc" }
          }
        }
      });

      return jsonResponse({
        receiptUploadId: failed.id,
        status: failed.status,
        retailer: failed.retailer ?? "unknown",
        processedAt: failed.processedAt,
        rawText: failed.rawText,
        ocrResults: serializeLines(failed.ocrResults),
        error: "OCR processing timed out. Please retry with a clearer photo."
      });
    }
  }

  return jsonResponse({
    receiptUploadId: receipt.id,
    status: receipt.status,
    retailer: receipt.retailer ?? "unknown",
    processedAt: receipt.processedAt,
    rawText: receipt.rawText,
    ocrResults: serializeLines(receipt.ocrResults)
  });
}
