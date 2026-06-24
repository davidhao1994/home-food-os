"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ItemCategory, StorageLocation } from "@prisma/client";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useUiStore } from "@/store/ui-store";
import {
  formatCategoryLabel,
  getDefaultStorageLocation,
  getExpirationBucket,
  getExpirationLabel,
  getFoodCategoryDefaults,
  isExpiringSoonBucket,
  getSuggestedExpirationDate
} from "@/utils/food";

type InventoryDto = {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  quantity: number;
  unit: string;
  lowStockThreshold: number;
  consumptionRatePerDay: number | null;
  unitPrice: number | null;
  category: ItemCategory;
  purchaseDate: string | null;
  expirationDate: string | null;
  storageLocation: StorageLocation;
  notes: string | null;
};

type Props = {
  initialItems: InventoryDto[];
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

const locations = ["REFRIGERATOR", "FREEZER", "PANTRY", "COUNTERTOP"] as const;

const DEFAULT_PURCHASE_DATE = new Date().toISOString().slice(0, 10);

function parseDateInput(value: string) {
  return value ? new Date(`${value}T12:00:00`) : null;
}

function formatDateInput(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function createDefaultForm(category: ItemCategory = "OTHER", purchaseDate = DEFAULT_PURCHASE_DATE) {
  return {
    name: "",
    brand: "",
    barcode: "",
    quantity: "1",
    unit: "pcs",
    lowStockThreshold: "1",
    consumptionRatePerDay: "",
    unitPrice: "",
    category,
    purchaseDate,
    expirationDate: formatDateInput(getSuggestedExpirationDate(category, parseDateInput(purchaseDate))),
    storageLocation: getDefaultStorageLocation(category),
    notes: ""
  };
}

export function InventoryView({ initialItems }: Props) {
  const searchParams = useSearchParams();
  const [items, setItems] = useState(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [form, setForm] = useState(createDefaultForm());
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [locationFilter, setLocationFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"name" | "expiration">("expiration");
  const expiringFilterOn = searchParams.get("filter") === "expiring";
  const { inventoryView, search, setInventoryView, setSearch } = useUiStore();
  const categoryDefaults = getFoodCategoryDefaults(form.category);
  const suggestedExpirationDate = formatDateInput(getSuggestedExpirationDate(form.category, parseDateInput(form.purchaseDate)));

  const filtered = useMemo(() => {
    return [...items]
      .filter((item) => (categoryFilter === "ALL" ? true : item.category === categoryFilter))
      .filter((item) => (locationFilter === "ALL" ? true : item.storageLocation === locationFilter))
      .filter((item) => {
        if (!expiringFilterOn) {
          return true;
        }

        return isExpiringSoonBucket(getExpirationBucket(item.expirationDate ? new Date(item.expirationDate) : null));
      })
      .filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === "name") {
          return a.name.localeCompare(b.name);
        }

        if (!a.expirationDate) return 1;
        if (!b.expirationDate) return -1;

        return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
      });
  }, [items, categoryFilter, locationFilter, expiringFilterOn, search, sortBy]);

  const resetForm = () => {
    setEditingId(null);
    setForm(createDefaultForm());
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    resetForm();
  };

  const openCreateEditor = () => {
    resetForm();
    setIsEditorOpen(true);
  };

  const updateCategory = (nextCategory: ItemCategory) => {
    setForm((current) => {
      const previousSuggested = formatDateInput(getSuggestedExpirationDate(current.category, parseDateInput(current.purchaseDate)));
      const nextSuggested = formatDateInput(getSuggestedExpirationDate(nextCategory, parseDateInput(current.purchaseDate)));

      return {
        ...current,
        category: nextCategory,
        storageLocation: getDefaultStorageLocation(nextCategory),
        expirationDate: !current.expirationDate || current.expirationDate === previousSuggested ? nextSuggested : current.expirationDate
      };
    });
  };

  const updatePurchaseDate = (purchaseDate: string) => {
    setForm((current) => {
      const previousSuggested = formatDateInput(getSuggestedExpirationDate(current.category, parseDateInput(current.purchaseDate)));
      const nextSuggested = formatDateInput(getSuggestedExpirationDate(current.category, parseDateInput(purchaseDate)));

      return {
        ...current,
        purchaseDate,
        expirationDate: !current.expirationDate || current.expirationDate === previousSuggested ? nextSuggested : current.expirationDate
      };
    });
  };

  const saveItem = async (event: React.FormEvent) => {
    event.preventDefault();

    const response = await fetch("/api/inventory", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(editingId ? { id: editingId } : {}),
        ...form,
        quantity: Number(form.quantity),
        lowStockThreshold: Number(form.lowStockThreshold),
        consumptionRatePerDay: form.consumptionRatePerDay ? Number(form.consumptionRatePerDay) : null,
        unitPrice: form.unitPrice ? Number(form.unitPrice) : null,
        purchaseDate: form.purchaseDate || null,
        expirationDate: form.expirationDate || null
      })
    });

    if (!response.ok) {
      return;
    }

    const next = await response.json();

    if (editingId) {
      setItems((current) => current.map((item) => (item.id === next.item.id ? next.item : item)));
    } else {
      setItems((current) => [next.item, ...current]);
    }

    closeEditor();
  };

  const startEdit = (item: InventoryDto) => {
    setEditingId(item.id);
    setIsEditorOpen(true);
    setForm({
      name: item.name,
      brand: item.brand ?? "",
      barcode: item.barcode ?? "",
      quantity: String(item.quantity),
      unit: item.unit,
      lowStockThreshold: String(item.lowStockThreshold),
      consumptionRatePerDay: item.consumptionRatePerDay != null ? String(item.consumptionRatePerDay) : "",
      unitPrice: item.unitPrice != null ? String(item.unitPrice) : "",
      category: item.category,
      purchaseDate: item.purchaseDate ? item.purchaseDate.slice(0, 10) : "",
      expirationDate: item.expirationDate ? item.expirationDate.slice(0, 10) : "",
      storageLocation: item.storageLocation,
      notes: item.notes ?? ""
    });
  };

  const removeItem = async (id: string) => {
    await fetch(`/api/inventory?id=${id}`, { method: "DELETE" });
    setItems((current) => current.filter((item) => item.id !== id));
    if (editingId === id) {
      resetForm();
    }
  };

  const consumeItem = async (id: string, quantity = 1) => {
    const response = await fetch("/api/inventory/consume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, quantity, note: "Quick consume" })
    });

    if (!response.ok) {
      return;
    }

    const next = await response.json();
    setItems((current) => current.map((item) => (item.id === next.item.id ? next.item : item)));
  };

  return (
    <div className="space-y-6">
      {expiringFilterOn ? (
        <Card>
          <CardContent className="flex flex-col gap-3 py-4 text-sm md:flex-row md:items-center md:justify-between">
            <p className="font-medium">Showing expiring items only.</p>
            <Button asChild type="button" variant="outline" size="sm">
              <Link href="/inventory">Clear filter</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" />
        </div>
        <select
          className="h-11 rounded-md border border-input bg-background px-3"
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
        >
          <option value="ALL">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category.replace("_", " ")}
            </option>
          ))}
        </select>
        <select
          className="h-11 rounded-md border border-input bg-background px-3"
          value={locationFilter}
          onChange={(event) => setLocationFilter(event.target.value)}
        >
          <option value="ALL">All locations</option>
          {locations.map((location) => (
            <option key={location} value={location}>
              {location.replace("_", " ")}
            </option>
          ))}
        </select>
        <select
          className="h-11 rounded-md border border-input bg-background px-3"
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as "name" | "expiration")}
        >
          <option value="expiration">Sort by expiration</option>
          <option value="name">Sort by name</option>
        </select>
        <Button variant="secondary" onClick={() => setInventoryView(inventoryView === "cards" ? "table" : "cards")}>
          {inventoryView === "cards" ? "Table View" : "Card View"}
        </Button>
        <Button onClick={openCreateEditor}>+ Add Ingredient</Button>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">No inventory items found.</CardContent>
        </Card>
      ) : null}

      {inventoryView === "cards" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => {
            const bucket = getExpirationBucket(item.expirationDate ? new Date(item.expirationDate) : null);

            return (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    {item.quantity} {item.unit}
                  </p>
                  <p className="text-muted-foreground">Brand: {item.brand || "-"}</p>
                  <p className="text-muted-foreground">Barcode: {item.barcode || "-"}</p>
                  <p className="text-muted-foreground">Purchased: {item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : "-"}</p>
                  <p className="text-muted-foreground">{item.storageLocation.replace("_", " ")}</p>
                  {item.quantity <= item.lowStockThreshold ? (
                    <Badge variant="warning" className="w-fit">Low stock</Badge>
                  ) : null}
                  <Badge
                    variant={bucket === "expired" ? "danger" : bucket === "safe" ? "success" : "warning"}
                    className="w-fit"
                  >
                    {getExpirationLabel(bucket)}
                  </Badge>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button className="flex-1 md:flex-none" variant="secondary" onClick={() => consumeItem(item.id, 1)}>
                      Consume 1
                    </Button>
                    <Button className="flex-1 md:flex-none" variant="secondary" onClick={() => startEdit(item)}>
                      Edit
                    </Button>
                    <Button className="flex-1 md:flex-none" variant="ghost" onClick={() => removeItem(item.id)}>
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Quantity</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Brand</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Purchased</th>
                  <th className="p-3">Expires</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="p-3">{item.name}</td>
                    <td className="p-3">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="p-3">{item.category.replace("_", " ")}</td>
                    <td className="p-3">{item.brand ?? "-"}</td>
                    <td className="p-3">{item.storageLocation.replace("_", " ")}</td>
                    <td className="p-3">{item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : "-"}</td>
                    <td className="p-3">{item.expirationDate ? new Date(item.expirationDate).toLocaleDateString() : "-"}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" size="sm" onClick={() => consumeItem(item.id, 1)}>
                          Consume 1
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => startEdit(item)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {isEditorOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 md:items-center md:justify-center" role="dialog" aria-modal="true">
          <button type="button" aria-label="Close" className="absolute inset-0 h-full w-full" onClick={closeEditor} />
          <div className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-background p-4 pb-6 shadow-2xl md:max-h-[85vh] md:max-w-3xl md:rounded-2xl md:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Food Inventory</p>
                <h2 className="mt-1 text-xl font-semibold">{editingId ? "Edit Ingredient" : "Add Ingredient"}</h2>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={closeEditor}>Close</Button>
            </div>

            <form onSubmit={saveItem} className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Ingredient name"
                required
              />
              <Input
                value={form.quantity}
                onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
                type="number"
                step="0.01"
                min="0"
                required
              />
              <Input
                value={form.brand}
                onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))}
                placeholder="Brand"
              />
              <Input
                value={form.barcode}
                onChange={(event) => setForm((current) => ({ ...current, barcode: event.target.value }))}
                placeholder="Barcode"
              />
              <Input
                value={form.unit}
                onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))}
                placeholder="Unit"
                required
              />
              <Input
                value={form.lowStockThreshold}
                onChange={(event) => setForm((current) => ({ ...current, lowStockThreshold: event.target.value }))}
                type="number"
                step="0.01"
                min="0"
                placeholder="Low-stock threshold"
                required
              />
              <Input
                value={form.consumptionRatePerDay}
                onChange={(event) => setForm((current) => ({ ...current, consumptionRatePerDay: event.target.value }))}
                type="number"
                step="0.01"
                min="0"
                placeholder="Consumption/day"
              />
              <Input
                value={form.unitPrice}
                onChange={(event) => setForm((current) => ({ ...current, unitPrice: event.target.value }))}
                type="number"
                step="0.01"
                min="0"
                placeholder="Unit price"
              />
              <select
                value={form.category}
                onChange={(event) => updateCategory(event.target.value as ItemCategory)}
                className="h-11 rounded-md border border-input bg-background px-3"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category.replace("_", " ")}
                  </option>
                ))}
              </select>
              <select
                value={form.storageLocation}
                onChange={(event) =>
                  setForm((current) => ({ ...current, storageLocation: event.target.value as StorageLocation }))
                }
                className="h-11 rounded-md border border-input bg-background px-3"
              >
                {locations.map((location) => (
                  <option key={location} value={location}>
                    {location.replace("_", " ")}
                  </option>
                ))}
              </select>
              <Input
                type="date"
                value={form.purchaseDate}
                onChange={(event) => updatePurchaseDate(event.target.value)}
              />
              <Input
                type="date"
                value={form.expirationDate}
                onChange={(event) => setForm((current) => ({ ...current, expirationDate: event.target.value }))}
              />
              <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 px-3 py-3 text-sm text-muted-foreground md:col-span-2">
                <p className="font-medium text-foreground">Smart defaults for {formatCategoryLabel(form.category)}</p>
                <p className="mt-1">
                  Store in {formatCategoryLabel(categoryDefaults.storageLocation)} and use within {categoryDefaults.expirationDays ?? "a flexible"} day{categoryDefaults.expirationDays === 1 ? "" : "s"}.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => setForm((current) => ({ ...current, expirationDate: suggestedExpirationDate }))}>
                    Apply suggested expiration
                  </Button>
                  <span className="self-center text-xs text-muted-foreground">Suggested date: {suggestedExpirationDate || "No date"}</span>
                </div>
              </div>
              <div className="md:col-span-2">
                <Input
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Notes"
                />
              </div>
              <div className="flex flex-col gap-2 md:col-span-2 md:flex-row">
                <Button className="w-full md:w-auto" type="submit">{editingId ? "Save Changes" : "Add to Inventory"}</Button>
                <Button className="w-full md:w-auto" type="button" variant="secondary" onClick={closeEditor}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
