import { ReceiptStatus } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { enqueueReceiptProcessing, runReceiptOcrFromBase64 } from "@/services/ocr.service";
import { jsonResponse } from "@/utils/serialize";

const receiptUploadSchema = z.object({
  imageData: z.string().trim().min(100),
  fileName: z.string().trim().max(255).optional(),
  mimeType: z.string().trim().max(120).optional()
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const rate = checkRateLimit(`receipt:${ip}`, 20, 60_000);

  if (!rate.ok) {
    return jsonResponse({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const user = await requireUser();
  const payload = await request.json().catch(() => null);
  const parsed = receiptUploadSchema.safeParse(payload);

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
  const syntheticUrl = `upload://${body.fileName ?? "receipt-image"}`;

  const upload = await prisma.receiptUpload.create({
    data: {
      userId: user.id,
      imageUrl: syntheticUrl,
      status: ReceiptStatus.UPLOADED
    }
  });

  try {
    await enqueueReceiptProcessing(upload.id);

    const ocr = await runReceiptOcrFromBase64(body.imageData);

    await prisma.receiptUpload.update({
      where: { id: upload.id },
      data: {
        status: ReceiptStatus.REVIEW_REQUIRED,
        processedAt: new Date(),
        rawText: ocr.rawText,
        retailer: ocr.retailer
      }
    });

    await prisma.ocrResult.createMany({
      data: ocr.lines.map((line) => ({
        receiptUploadId: upload.id,
        rawLine: line.rawLine,
        extractedName: line.extractedName,
        extractedQuantity: line.extractedQuantity,
        extractedUnit: line.extractedUnit,
        extractedPrice: line.extractedPrice,
        confidence: line.confidence,
        lineStatus: line.lineStatus
      }))
    });

    const ocrResults = await prisma.ocrResult.findMany({ where: { receiptUploadId: upload.id } });

    return jsonResponse({
      receiptUploadId: upload.id,
      retailer: ocr.retailer,
      ocrResults: ocrResults.map((line) => ({
        ...line,
        extractedQuantity: line.extractedQuantity ? Number(line.extractedQuantity) : null,
        extractedPrice: line.extractedPrice ? Number(line.extractedPrice) : null,
        confidence: line.confidence ? Number(line.confidence) : null
      }))
    });
  } catch {
    await prisma.receiptUpload.update({
      where: { id: upload.id },
      data: {
        status: ReceiptStatus.FAILED,
        processedAt: new Date()
      }
    });

    return jsonResponse({ error: "OCR extraction failed for this receipt image" }, { status: 422 });
  }
}
