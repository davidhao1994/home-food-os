import { create } from "zustand";

type ViewMode = "cards" | "table";

type UiState = {
  inventoryView: ViewMode;
  search: string;
  setInventoryView: (view: ViewMode) => void;
  setSearch: (value: string) => void;
};

export const useUiStore = create<UiState>((set) => ({
  inventoryView: "cards",
  search: "",
  setInventoryView: (inventoryView) => set({ inventoryView }),
  setSearch: (search) => set({ search })
}));
