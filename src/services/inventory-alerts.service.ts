import { InventoryItem } from "@prisma/client";
import { getExpirationBucket, isExpiringSoonBucket } from "@/utils/food";

export type InventoryAlert = {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
};

export function buildInventoryAlerts(items: InventoryItem[]): InventoryAlert[] {
  const alerts: InventoryAlert[] = [];

  for (const item of items) {
    const quantity = Number(item.quantity);
    const lowStockThreshold = Number(item.lowStockThreshold);
    const expirationBucket = getExpirationBucket(item.expirationDate);

    if (quantity <= lowStockThreshold) {
      alerts.push({
        id: `${item.id}-low-stock`,
        severity: "high",
        title: `${item.name} is low stock`,
        detail: `${quantity} ${item.unit} remaining (threshold ${lowStockThreshold}).`
      });
    }

    if (isExpiringSoonBucket(expirationBucket)) {
      const daysText =
        expirationBucket === "today"
          ? "expires today"
          : expirationBucket === "threeDays"
            ? "expires in 3 days"
            : expirationBucket === "sevenDays"
              ? "expires in 7 days"
              : "already expired";

      alerts.push({
        id: `${item.id}-expiry`,
        severity: expirationBucket === "expired" || expirationBucket === "today" ? "high" : "medium",
        title: `${item.name} ${daysText}`,
        detail: `Current quantity: ${quantity} ${item.unit}.`
      });
    }

    if (item.purchaseDate) {
      const ageDays = Math.floor((Date.now() - item.purchaseDate.getTime()) / (24 * 60 * 60 * 1000));
      if (ageDays >= 5) {
        alerts.push({
          id: `${item.id}-age`,
          severity: "low",
          title: `${item.name} purchased ${ageDays} days ago`,
          detail: "Consider using this item soon to reduce waste."
        });
      }
    }
  }

  const severityOrder = { high: 0, medium: 1, low: 2 };
  return alerts.sort((left, right) => severityOrder[left.severity] - severityOrder[right.severity]).slice(0, 8);
}
