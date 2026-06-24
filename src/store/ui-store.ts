import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AppLanguage } from "@/lib/i18n";

type ViewMode = "cards" | "table";

type UiState = {
  inventoryView: ViewMode;
  search: string;
  language: AppLanguage;
  setInventoryView: (view: ViewMode) => void;
  setSearch: (value: string) => void;
  setLanguage: (value: AppLanguage) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      inventoryView: "cards",
      search: "",
      language: "en",
      setInventoryView: (inventoryView) => set({ inventoryView }),
      setSearch: (search) => set({ search }),
      setLanguage: (language) => set({ language })
    }),
    {
      name: "home-food-os-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ language: state.language })
    }
  )
);
