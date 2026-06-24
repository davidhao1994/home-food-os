"use client";

import { useMemo, useState } from "react";
import { ItemCategory, ShoppingPriority } from "@prisma/client";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ShoppingDto = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: ItemCategory;
  priority: ShoppingPriority;
  estimatedPrice: number | null;
  isPurchased: boolean;
};

type Props = {
  initialItems: ShoppingDto[];
};

const categories = [
  "MEAT",
  "SEAFOOD",
  "VEGETABLES",
  "FRUITS",
  "DAIRY",
  "EGGS",
  "GRAINS",
  "FROZEN_FOODS",
  "CONDIMENTS",
  "SNACKS",
  "BEVERAGES",
  "OTHER"
] as const;

const priorities = ["LOW", "MEDIUM", "HIGH"] as const;

export function ShoppingView({ initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    quantity: "1",
    unit: "pcs",
    category: "OTHER" as ItemCategory,
    priority: "MEDIUM" as ShoppingPriority,
    estimatedPrice: ""
  });

  const resetForm = () => {
    setEditingId(null);
    setForm({ name: "", quantity: "1", unit: "pcs", category: "OTHER", priority: "MEDIUM", estimatedPrice: "" });
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    resetForm();
  };

  const openCreateEditor = () => {
    resetForm();
    setIsEditorOpen(true);
  };

  const filteredItems = useMemo(
    () => items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())),
    [items, search]
  );

  const saveItem = async (event: React.FormEvent) => {
    event.preventDefault();

    const response = await fetch("/api/shopping", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(editingId ? { id: editingId } : {}),
        ...form,
        quantity: Number(form.quantity),
        estimatedPrice: form.estimatedPrice ? Number(form.estimatedPrice) : null
      })
    });

    if (!response.ok) {
      return;
    }

    const data = await response.json();

    if (editingId) {
      setItems((current) => current.map((item) => (item.id === data.item.id ? data.item : item)));
    } else {
      setItems((current) => [data.item, ...current]);
    }

    closeEditor();
  };

  const startEdit = (item: ShoppingDto) => {
    setEditingId(item.id);
    setIsEditorOpen(true);
    setForm({
      name: item.name,
      quantity: String(item.quantity),
      unit: item.unit,
      category: item.category,
      priority: item.priority,
      estimatedPrice: item.estimatedPrice != null ? String(item.estimatedPrice) : ""
    });
  };

  const markPurchased = async (id: string, moveToInventory = false) => {
    const response = await fetch("/api/shopping", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: moveToInventory ? "purchase_and_move" : "purchase" })
    });

    if (!response.ok) {
      return;
    }

    const data = await response.json();
    setItems((current) => current.map((item) => (item.id === id ? data.item : item)));
  };

  const remove = async (id: string) => {
    await fetch(`/api/shopping?id=${id}`, { method: "DELETE" });
    setItems((current) => current.filter((item) => item.id !== id));
    if (editingId === id) {
      resetForm();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" />
        </div>
        <Button onClick={openCreateEditor}>+ Add Item</Button>
      </div>

      <div className="space-y-3">
        {filteredItems.length === 0 ? <p className="text-sm text-muted-foreground">Shopping list is empty.</p> : null}
        {filteredItems.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex flex-col gap-2 pt-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  {item.quantity} {item.unit} • {item.category.replace("_", " ")} • Priority: {item.priority}
                </p>
                {item.estimatedPrice != null ? <p className="text-sm text-muted-foreground">Estimated price: ${item.estimatedPrice.toFixed(2)}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {!item.isPurchased ? (
                  <>
                    <Button className="flex-1 md:flex-none" variant="secondary" onClick={() => startEdit(item)}>
                      Edit
                    </Button>
                    <Button className="flex-1 md:flex-none" variant="secondary" onClick={() => markPurchased(item.id)}>
                      Mark Purchased
                    </Button>
                    <Button className="w-full md:w-auto" onClick={() => markPurchased(item.id, true)}>Purchase + Add to Inventory</Button>
                  </>
                ) : (
                  <span className="rounded-md bg-success px-3 py-2 text-xs text-success-foreground">Purchased</span>
                )}
                <Button className="flex-1 md:flex-none" variant="ghost" onClick={() => remove(item.id)}>
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isEditorOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 md:items-center md:justify-center" role="dialog" aria-modal="true">
          <button type="button" aria-label="Close" className="absolute inset-0 h-full w-full" onClick={closeEditor} />
          <div className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-background p-4 pb-6 shadow-2xl md:max-h-[85vh] md:max-w-2xl md:rounded-2xl md:p-6">
            <Card className="border-0 shadow-none">
              <CardHeader className="px-0 pb-4 pt-0">
                <CardTitle>{editingId ? "Edit Shopping Item" : "Add Item"}</CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <form onSubmit={saveItem} className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} placeholder="Name" required />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.quantity}
                    onChange={(e) => setForm((c) => ({ ...c, quantity: e.target.value }))}
                    required
                  />
                  <Input value={form.unit} onChange={(e) => setForm((c) => ({ ...c, unit: e.target.value }))} placeholder="Unit" required />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.estimatedPrice}
                    onChange={(e) => setForm((c) => ({ ...c, estimatedPrice: e.target.value }))}
                    placeholder="Estimated price"
                  />
                  <select
                    className="h-11 rounded-md border border-input bg-background px-3"
                    value={form.category}
                    onChange={(e) => setForm((c) => ({ ...c, category: e.target.value as ItemCategory }))}
                  >
                    {categories.map((value) => (
                      <option key={value} value={value}>
                        {value.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-11 rounded-md border border-input bg-background px-3"
                    value={form.priority}
                    onChange={(e) => setForm((c) => ({ ...c, priority: e.target.value as ShoppingPriority }))}
                  >
                    {priorities.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <div className="flex flex-col gap-2 md:col-span-2 md:flex-row">
                    <Button className="w-full md:w-auto" type="submit">{editingId ? "Save Changes" : "Add Item"}</Button>
                    <Button className="w-full md:w-auto" type="button" variant="secondary" onClick={closeEditor}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
