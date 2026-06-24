"use client";

import { useEffect, useMemo, useState } from "react";
import { ItemCategory, ShoppingPriority } from "@prisma/client";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useUiStore } from "@/store/ui-store";
import { formatCategoryLabel } from "@/utils/food";

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
  smartRebuySuggestions: Array<{
    name: string;
    category: ItemCategory;
    reason: string;
  }>;
  missingForRecipes: Array<{
    name: string;
    recipeName: string;
    category: ItemCategory | string | null;
  }>;
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

export function ShoppingView({ initialItems, smartRebuySuggestions, missingForRecipes }: Props) {
  const language = useUiStore((state) => state.language);
  const tr = (en: string, zh: string) => (language === "zh" ? zh : en);
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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const closeEditorOnTabSwitch = () => {
      setIsEditorOpen(false);
      setEditingId(null);
    };

    window.addEventListener("home-food-os:tab-switch", closeEditorOnTabSwitch);
    return () => window.removeEventListener("home-food-os:tab-switch", closeEditorOnTabSwitch);
  }, []);

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

  const quickAddSuggestion = async (input: { name: string; category: ItemCategory | string | null; source: "rebuy" | "recipe" }) => {
    const fallbackCategory = (typeof input.category === "string" ? input.category : "OTHER") as ItemCategory;
    const response = await fetch("/api/shopping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.name,
        quantity: 1,
        unit: "item",
        category: fallbackCategory,
        priority: input.source === "recipe" ? "HIGH" : "MEDIUM"
      })
    });

    if (!response.ok) {
      return;
    }

    const data = await response.json();
    setItems((current) => [data.item, ...current]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{tr("Smart Rebuy", "智能回购")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {smartRebuySuggestions.length === 0 ? <p className="text-sm text-muted-foreground">{tr("No rebuy signals yet. Scan more receipts to learn your pattern.", "暂时没有回购建议。多扫描几次小票后会更准确。")}</p> : null}
          {smartRebuySuggestions.map((suggestion) => (
            <div key={`rebuy-${suggestion.name}`} className="flex flex-col gap-2 rounded-xl border p-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">{suggestion.name}</p>
                <p className="text-xs text-muted-foreground">{formatCategoryLabel(suggestion.category)} • {tr("You often buy this but not recently.", "你经常购买但最近没买。")}</p>
              </div>
              <Button size="sm" onClick={() => quickAddSuggestion({ name: suggestion.name, category: suggestion.category, source: "rebuy" })}>{tr("Add to Manual List", "加入手动清单")}</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tr("Missing for Recipes", "菜谱缺少")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {missingForRecipes.length === 0 ? <p className="text-sm text-muted-foreground">{tr("Current top recipe picks are mostly covered.", "当前推荐菜谱所需食材基本齐全。")}</p> : null}
          {missingForRecipes.map((item) => (
            <div key={`missing-${item.name}`} className="flex flex-col gap-2 rounded-xl border p-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">{tr("Needed for", "用于")} {item.recipeName}</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => quickAddSuggestion({ name: item.name, category: item.category, source: "recipe" })}>{tr("Add", "加入")}</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>{tr("Manual List", "手动清单")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tr("Search manual list", "搜索手动清单")} />
            </div>
            <Button variant="outline" onClick={openCreateEditor}>+ {tr("Manual Add", "手动添加")}</Button>
          </div>

          <div className="space-y-3">
            {filteredItems.length === 0 ? <p className="text-sm text-muted-foreground">{tr("Manual list is empty.", "手动清单为空。")}</p> : null}
            {filteredItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex flex-col gap-2 pt-6 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} {item.unit} • {item.category.replace("_", " ")} • {tr("Priority", "优先级")}: {item.priority}
                    </p>
                    {item.estimatedPrice != null ? <p className="text-sm text-muted-foreground">{tr("Estimated price", "预计价格")}: ${item.estimatedPrice.toFixed(2)}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!item.isPurchased ? (
                      <>
                        <Button className="flex-1 md:flex-none" variant="secondary" onClick={() => startEdit(item)}>
                          {tr("Edit", "编辑")}
                        </Button>
                        <Button className="flex-1 md:flex-none" variant="secondary" onClick={() => markPurchased(item.id)}>
                          {tr("Mark Purchased", "标记已购买")}
                        </Button>
                        <Button className="w-full md:w-auto" onClick={() => markPurchased(item.id, true)}>{tr("Purchase + Add to Inventory", "购买并加入库存")}</Button>
                      </>
                    ) : (
                      <span className="rounded-md bg-success px-3 py-2 text-xs text-success-foreground">{tr("Purchased", "已购买")}</span>
                    )}
                    <Button className="flex-1 md:flex-none" variant="ghost" onClick={() => remove(item.id)}>
                      {tr("Delete", "删除")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {isEditorOpen ? (
        <div className="fixed inset-0 z-[180] flex items-end bg-black/40 md:items-center md:justify-center" role="dialog" aria-modal="true">
          <button type="button" aria-label="Close" className="absolute inset-0 h-full w-full" onClick={closeEditor} />
          <div className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-background p-4 pb-6 shadow-2xl md:max-h-[85vh] md:max-w-2xl md:rounded-2xl md:p-6">
            <Card className="border-0 shadow-none">
              <CardHeader className="px-0 pb-4 pt-0">
                <CardTitle>{editingId ? tr("Edit Shopping Item", "编辑购物项") : tr("Add Item", "添加购物项")}</CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <form onSubmit={saveItem} className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} placeholder={tr("Name", "名称")} required />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.quantity}
                    onChange={(e) => setForm((c) => ({ ...c, quantity: e.target.value }))}
                    required
                  />
                  <Input value={form.unit} onChange={(e) => setForm((c) => ({ ...c, unit: e.target.value }))} placeholder={tr("Unit", "单位")} required />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.estimatedPrice}
                    onChange={(e) => setForm((c) => ({ ...c, estimatedPrice: e.target.value }))}
                    placeholder={tr("Estimated price", "预计价格")}
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
                    <Button className="w-full md:w-auto" type="submit">{editingId ? tr("Save Changes", "保存修改") : tr("Add Item", "添加项目")}</Button>
                    <Button className="w-full md:w-auto" type="button" variant="secondary" onClick={closeEditor}>
                      {tr("Cancel", "取消")}
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
