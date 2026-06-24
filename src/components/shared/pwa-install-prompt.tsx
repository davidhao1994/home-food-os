"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl border bg-card p-3 shadow-lg md:left-auto md:right-6 md:w-[360px]">
      <p className="text-sm font-medium">Install Home Food OS</p>
      <p className="mt-1 text-xs text-muted-foreground">Add this app to your phone home screen for faster weekly use.</p>
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          onClick={async () => {
            await deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            setVisible(false);
            setDeferredPrompt(null);
          }}
        >
          Install
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setVisible(false)}>
          Later
        </Button>
      </div>
    </div>
  );
}
