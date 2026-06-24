import { PageHeader } from "@/components/shared/page-header";
import { ShoppingView } from "@/features/shopping/shopping-view";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ShoppingPage() {
  const user = await requireUser();

  const items = await prisma.shoppingListItem.findMany({
    where: { userId: user.id },
    orderBy: [{ isPurchased: "asc" }, { createdAt: "desc" }]
  });

  return (
    <div>
      <PageHeader title="Shopping List" subtitle="Plan purchases and move bought items into inventory." />
      <ShoppingView
        initialItems={items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          estimatedPrice: item.estimatedPrice ? Number(item.estimatedPrice) : null
        }))}
      />
    </div>
  );
}
