"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ItemCategory, StorageLocation } from "@prisma/client";
import { Search, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { normalizeReceiptItemName } from "@/services/grocery-normalization";
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

function parseReceiptRawFromNotes(notes: string | null) {
  if (!notes) {
    return null;
  }

  const line = notes
    .split(/\r?\n/)
    .map((part) => part.trim())
    .find((part) => part.startsWith("OCR_RAW:"));

  if (!line) {
    return null;
  }

  return line.replace(/^OCR_RAW:\s*/i, "").trim() || null;
}

function parseNoteValue(notes: string | null, key: string) {
  if (!notes) {
    return null;
  }

  const line = notes
    .split(/\r?\n/)
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${key}:`));

  if (!line) {
    return null;
  }

  return line.replace(new RegExp(`^${key}:\\s*`, "i"), "").trim() || null;
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
  const [receiptOnlyFilter, setReceiptOnlyFilter] = useState(false);
  const [needsReviewOnlyFilter, setNeedsReviewOnlyFilter] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const expiringFilterOn = searchParams.get("filter") === "expiring";
  const { inventoryView, search, setInventoryView, setSearch, language } = useUiStore();
  const tr = (en: string, zh: string) => (language === "zh" ? zh : en);
  const categoryDefaults = getFoodCategoryDefaults(form.category);
  const suggestedExpirationDate = formatDateInput(getSuggestedExpirationDate(form.category, parseDateInput(form.purchaseDate)));

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const syncMobile = () => setIsMobile(mediaQuery.matches);
    syncMobile();
    mediaQuery.addEventListener("change", syncMobile);

    return () => mediaQuery.removeEventListener("change", syncMobile);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const closeTransientUi = () => {
      setIsFilterPanelOpen(false);
      setIsEditorOpen(false);
      setEditingId(null);
    };

    window.addEventListener("home-food-os:tab-switch", closeTransientUi);
    return () => window.removeEventListener("home-food-os:tab-switch", closeTransientUi);
  }, []);

  const filtered = useMemo(() => {
    return [...items]
      .filter((item) => (categoryFilter === "ALL" ? true : item.category === categoryFilter))
      .filter((item) => (locationFilter === "ALL" ? true : item.storageLocation === locationFilter))
      .filter((item) => (receiptOnlyFilter ? item.notes?.includes("OCR_RAW:") : true))
      .filter((item) => (needsReviewOnlyFilter ? item.notes?.includes("OCR_NEEDS_REVIEW: true") : true))
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
  }, [items, categoryFilter, locationFilter, receiptOnlyFilter, needsReviewOnlyFilter, expiringFilterOn, search, sortBy]);

  const readableNamesById = useMemo(() => {
    const map = new Map<
      string,
      {
        primaryName: string;
        fallbackName: string;
        needsReview: boolean;
        rawName: string | null;
      }
    >();

    for (const item of items) {
      const rawName = parseReceiptRawFromNotes(item.notes);
      const noteDisplayEn = parseNoteValue(item.notes, "OCR_DISPLAY_EN");
      const noteDisplayZh = parseNoteValue(item.notes, "OCR_DISPLAY_ZH");
      const noteNormalized = parseNoteValue(item.notes, "OCR_NORMALIZED");
      const noteNeedsReview = parseNoteValue(item.notes, "OCR_NEEDS_REVIEW") === "true";
      const normalized = normalizeReceiptItemName(rawName || noteNormalized || item.name);
      const fallbackName = noteNormalized || normalized.normalizedName || normalized.displayName || item.name;
      const userCorrectedZh = /[\u3400-\u9fff]/.test(item.name) ? item.name : null;

      const primaryName =
        language === "zh"
          ? userCorrectedZh || noteDisplayZh || normalized.displayNameZh || normalized.possibleDisplayNameZh || noteDisplayEn || normalized.displayName || fallbackName
          : noteDisplayEn || normalized.displayName || noteDisplayZh || normalized.displayNameZh || fallbackName;

      map.set(item.id, {
        primaryName: primaryName || item.name,
        fallbackName,
        needsReview: noteNeedsReview || normalized.needsReview,
        rawName
      });
    }

    return map;
  }, [items, language]);

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
            <p className="font-medium">{tr("Showing expiring items only.", "仅显示快过期食材。")}</p>
            <Button asChild type="button" variant="outline" size="sm">
              <Link href="/inventory">{tr("Clear filter", "清除筛选")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="rounded-2xl border bg-card p-3">
        <div className="mb-3 flex flex-wrap gap-2">
          <Button asChild type="button" className="h-10">
            <Link href={{ pathname: "/receipts", query: { capture: "1" } }}>{tr("Scan Receipt", "扫描小票")}</Link>
          </Button>
          <Button asChild type="button" variant="outline" className="h-10">
            <Link href="/inventory?filter=expiring">{tr("See Expiring Soon", "查看快过期")}</Link>
          </Button>
          <details className="ml-auto">
            <summary className="h-10 cursor-pointer list-none rounded-md border border-input bg-background px-3 py-2 text-sm">{tr("More", "更多")}</summary>
            <div className="mt-2 w-44 rounded-md border bg-background p-2 shadow-md">
              <Button className="h-9 w-full justify-start" variant="ghost" onClick={openCreateEditor}>+ {tr("Add Ingredient", "添加食材")}</Button>
            </div>
          </details>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input className="h-10 pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tr("Search inventory", "搜索库存")} />
        </div>
        {isMobile ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => setIsFilterPanelOpen(true)}>
              <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
              {tr("Filter", "筛选")}
            </Button>
            <Button type="button" variant={expiringFilterOn ? "default" : "outline"} size="sm" className="h-9" asChild>
              <Link href={expiringFilterOn ? "/inventory" : "/inventory?filter=expiring"}>{tr("Expiring", "快过期")}</Link>
            </Button>
            <Button type="button" variant={receiptOnlyFilter ? "default" : "outline"} size="sm" className="h-9" onClick={() => setReceiptOnlyFilter((current) => !current)}>
              {tr("Receipt items", "小票食材")}
            </Button>
            <Button type="button" variant={needsReviewOnlyFilter ? "default" : "outline"} size="sm" className="h-9" onClick={() => setNeedsReviewOnlyFilter((current) => !current)}>
              {tr("Needs review", "需要确认")}
            </Button>
          </div>
        ) : (
          <>
            <select
              className="h-11 rounded-md border border-input bg-background px-3"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="ALL">{tr("All categories", "全部分类")}</option>
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
              <option value="ALL">{tr("All locations", "全部位置")}</option>
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
              <option value="expiration">{tr("Sort by expiration", "按过期时间")}</option>
              <option value="name">{tr("Sort by name", "按名称")}</option>
            </select>
          </>
        )}
        <Button variant="secondary" onClick={() => setInventoryView(inventoryView === "cards" ? "table" : "cards")}>
          {inventoryView === "cards" ? tr("Table View", "表格视图") : tr("Card View", "卡片视图")}
        </Button>
        </div>

        {(categoryFilter !== "ALL" || locationFilter !== "ALL" || sortBy !== "expiration" || receiptOnlyFilter || needsReviewOnlyFilter) && isMobile ? (
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {categoryFilter !== "ALL" ? <span className="rounded-full bg-muted px-2 py-1">{tr("Category", "分类")}: {categoryFilter.replace("_", " ")}</span> : null}
            {locationFilter !== "ALL" ? <span className="rounded-full bg-muted px-2 py-1">{tr("Location", "位置")}: {locationFilter.replace("_", " ")}</span> : null}
            {sortBy !== "expiration" ? <span className="rounded-full bg-muted px-2 py-1">{tr("Sort", "排序")}: {sortBy}</span> : null}
            {receiptOnlyFilter ? <span className="rounded-full bg-muted px-2 py-1">{tr("Receipt items", "小票食材")}</span> : null}
            {needsReviewOnlyFilter ? <span className="rounded-full bg-muted px-2 py-1">{tr("Needs review", "需要确认")}</span> : null}
          </div>
        ) : null}
      </div>

      {isMobile && isFilterPanelOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 h-full w-full" aria-label="Close filters" onClick={() => setIsFilterPanelOpen(false)} />
          <div className="relative z-10 w-full rounded-t-3xl bg-background p-4 pb-6 shadow-2xl">
            <h3 className="text-base font-semibold">{tr("Filters", "筛选")}</h3>
            <div className="mt-3 space-y-2">
              <select className="h-10 w-full rounded-md border border-input bg-background px-3" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="ALL">{tr("All categories", "全部分类")}</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category.replace("_", " ")}</option>
                ))}
              </select>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3" value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}>
                <option value="ALL">{tr("All locations", "全部位置")}</option>
                {locations.map((location) => (
                  <option key={location} value={location}>{location.replace("_", " ")}</option>
                ))}
              </select>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3" value={sortBy} onChange={(event) => setSortBy(event.target.value as "name" | "expiration")}>
                <option value="expiration">{tr("Sort by expiration", "按过期时间")}</option>
                <option value="name">{tr("Sort by name", "按名称")}</option>
              </select>
              <label className="flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm">
                <input type="checkbox" checked={receiptOnlyFilter} onChange={(event) => setReceiptOnlyFilter(event.target.checked)} />
                {tr("Receipt items only", "仅显示小票食材")}
              </label>
              <label className="flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm">
                <input type="checkbox" checked={needsReviewOnlyFilter} onChange={(event) => setNeedsReviewOnlyFilter(event.target.checked)} />
                {tr("Needs review only", "仅显示需要确认")}
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsFilterPanelOpen(false)}>{tr("Apply", "应用")}</Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setCategoryFilter("ALL");
                  setLocationFilter("ALL");
                  setSortBy("expiration");
                  setReceiptOnlyFilter(false);
                  setNeedsReviewOnlyFilter(false);
                  setIsFilterPanelOpen(false);
                }}
              >
                {tr("Reset", "重置")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">{tr("No inventory items found.", "未找到库存食材。")}</CardContent>
        </Card>
      ) : null}

      {inventoryView === "cards" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => {
            const bucket = getExpirationBucket(item.expirationDate ? new Date(item.expirationDate) : null);

            return (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{readableNamesById.get(item.id)?.primaryName || item.name}</CardTitle>
                  {readableNamesById.get(item.id)?.needsReview ? <p className="text-xs text-warning">{tr("Possible item - needs review", "可能是该食材，需要确认")}</p> : null}
                  {readableNamesById.get(item.id)?.rawName ? (
                    <p className="text-xs text-muted-foreground">{tr("Original receipt text:", "小票原文：")} {readableNamesById.get(item.id)?.rawName}</p>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="font-medium text-foreground">{formatCategoryLabel(item.category)} · {item.quantity} {item.unit}</p>
                  <p className="text-muted-foreground">{tr("Storage", "位置")}: {formatCategoryLabel(item.storageLocation)} · {tr("Source", "来源")}: {item.notes?.includes("OCR_RAW:") ? tr("receipt", "小票") : tr("manual", "手动")}</p>
                  <p className="text-muted-foreground">{tr("Purchased", "购买日期")}: {item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : "-"}</p>
                  {item.quantity <= item.lowStockThreshold ? (
                    <Badge variant="warning" className="w-fit">{tr("Low stock", "库存偏低")}</Badge>
                  ) : null}
                  <Badge
                    variant={bucket === "expired" ? "danger" : bucket === "safe" ? "success" : "warning"}
                    className="w-fit"
                  >
                    {getExpirationLabel(bucket)}
                  </Badge>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button className="flex-1 md:flex-none" variant="secondary" onClick={() => consumeItem(item.id, 1)}>
                      {tr("Consume 1", "消耗 1")}
                    </Button>
                    <Button className="flex-1 md:flex-none" variant="secondary" onClick={() => startEdit(item)}>
                      {tr("Edit", "编辑")}
                    </Button>
                    <Button className="flex-1 md:flex-none" variant="ghost" onClick={() => removeItem(item.id)}>
                      {tr("Delete", "删除")}
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
                  <th className="p-3">{tr("Quantity", "数量")}</th>
                  <th className="p-3">{tr("Category", "分类")}</th>
                  <th className="p-3">{tr("Brand", "品牌")}</th>
                  <th className="p-3">{tr("Location", "位置")}</th>
                  <th className="p-3">{tr("Purchased", "购买日期")}</th>
                  <th className="p-3">{tr("Expires", "过期日期")}</th>
                  <th className="p-3">{tr("Actions", "操作")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="p-3">
                      <p className="font-medium">{readableNamesById.get(item.id)?.primaryName || item.name}</p>
                      {readableNamesById.get(item.id)?.needsReview ? <p className="text-xs text-warning">{tr("Possible item - needs review", "可能是该食材，需要确认")}</p> : null}
                      {readableNamesById.get(item.id)?.rawName ? (
                        <p className="text-xs text-muted-foreground">({readableNamesById.get(item.id)?.rawName})</p>
                      ) : null}
                    </td>
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
                          {tr("Consume 1", "消耗 1")}
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => startEdit(item)}>
                          {tr("Edit", "编辑")}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)}>
                          {tr("Delete", "删除")}
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
                <h2 className="mt-1 text-xl font-semibold">{editingId ? tr("Edit Ingredient", "编辑食材") : tr("Add Ingredient", "添加食材")}</h2>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={closeEditor}>{tr("Close", "关闭")}</Button>
            </div>

            <form onSubmit={saveItem} className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder={tr("Ingredient name", "食材名称")}
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
                placeholder={tr("Brand", "品牌")}
              />
              <Input
                value={form.barcode}
                onChange={(event) => setForm((current) => ({ ...current, barcode: event.target.value }))}
                placeholder={tr("Barcode", "条码")}
              />
              <Input
                value={form.unit}
                onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))}
                placeholder={tr("Unit", "单位")}
                required
              />
              <Input
                value={form.lowStockThreshold}
                onChange={(event) => setForm((current) => ({ ...current, lowStockThreshold: event.target.value }))}
                type="number"
                step="0.01"
                min="0"
                placeholder={tr("Low-stock threshold", "低库存阈值")}
                required
              />
              <Input
                value={form.consumptionRatePerDay}
                onChange={(event) => setForm((current) => ({ ...current, consumptionRatePerDay: event.target.value }))}
                type="number"
                step="0.01"
                min="0"
                placeholder={tr("Consumption/day", "每日消耗")}
              />
              <Input
                value={form.unitPrice}
                onChange={(event) => setForm((current) => ({ ...current, unitPrice: event.target.value }))}
                type="number"
                step="0.01"
                min="0"
                placeholder={tr("Unit price", "单价")}
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
                <p className="font-medium text-foreground">{tr("Smart defaults for", "智能默认值：")} {formatCategoryLabel(form.category)}</p>
                <p className="mt-1">
                  {tr("Store in", "建议存放于")} {formatCategoryLabel(categoryDefaults.storageLocation)}，{tr("use within", "建议在")}
                  {categoryDefaults.expirationDays ?? tr("a flexible period", "灵活时段")} {tr("day(s)", "天内")}。
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => setForm((current) => ({ ...current, expirationDate: suggestedExpirationDate }))}>
                    {tr("Apply suggested expiration", "应用建议保质期")}
                  </Button>
                  <span className="self-center text-xs text-muted-foreground">{tr("Suggested date:", "建议日期：")} {suggestedExpirationDate || tr("No date", "无")}</span>
                </div>
              </div>
              <div className="md:col-span-2">
                <Input
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder={tr("Notes", "备注")}
                />
              </div>
              <div className="flex flex-col gap-2 md:col-span-2 md:flex-row">
                <Button className="w-full md:w-auto" type="submit">{editingId ? tr("Save Changes", "保存修改") : tr("Add to Inventory", "添加到库存")}</Button>
                <Button className="w-full md:w-auto" type="button" variant="secondary" onClick={closeEditor}>
                  {tr("Cancel", "取消")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
