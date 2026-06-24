import { ReceiptStatus } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { jsonResponse } from "@/utils/serialize";

const receiptUploadSchema = z.object({
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

  console.info("[receipt-ocr] receipt uploaded", {
    receiptUploadId: upload.id,
    userId: user.id,
    fileName: body.fileName ?? "receipt-image",
    mimeType: body.mimeType ?? "unknown"
  });

  return jsonResponse({
    receiptUploadId: upload.id,
    status: upload.status
  });
}
