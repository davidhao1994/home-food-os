"use client";

import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { languageLabel, type AppLanguage } from "@/lib/i18n";
import { useUiStore } from "@/store/ui-store";

const languageOrder: AppLanguage[] = ["en", "zh"];

export function LanguageToggle() {
  const language = useUiStore((state) => state.language);
  const setLanguage = useUiStore((state) => state.setLanguage);

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border bg-background/70 p-1" aria-label="Language switcher">
      {languageOrder.map((item) => {
        const isActive = item === language;

        return (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={isActive ? "secondary" : "ghost"}
            className="h-8 px-2.5"
            onClick={() => setLanguage(item)}
            aria-pressed={isActive}
            aria-label={`Switch language to ${languageLabel[item]}`}
          >
            {item === "en" ? <Languages className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> : null}
            {languageLabel[item]}
          </Button>
        );
      })}
    </div>
  );
}
