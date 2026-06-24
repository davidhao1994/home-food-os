import { PageHeader } from "@/components/shared/page-header";
import { InventoryView } from "@/features/inventory/inventory-view";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function InventoryPage() {
  const user = await requireUser();

  const items = await prisma.inventoryItem.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div>
      <PageHeader title="Food Inventory" subtitle="Track quantities, categories, locations, and expirations." />
      <InventoryView
        initialItems={items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          lowStockThreshold: Number(item.lowStockThreshold),
          consumptionRatePerDay: item.consumptionRatePerDay ? Number(item.consumptionRatePerDay) : null,
          unitPrice: item.unitPrice ? Number(item.unitPrice) : null,
          purchaseDate: item.purchaseDate?.toISOString() ?? null,
          expirationDate: item.expirationDate?.toISOString() ?? null
        }))}
      />
    </div>
  );
}
