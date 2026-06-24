import { ReactNode } from "react";
import { isFamilyDemoModeEnabled } from "@/lib/family-demo";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { NavLinks } from "@/components/layout/nav-links";
import { ThemeToggle } from "@/components/layout/theme-toggle";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const showProfile = !isFamilyDemoModeEnabled();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(182,226,196,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,214,153,0.12),transparent_30%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col md:flex-row md:items-start">
        <aside className="hidden w-full border-b bg-card/70 p-4 pt-[max(env(safe-area-inset-top),1rem)] backdrop-blur md:block md:w-72 md:border-b-0 md:border-r md:p-6">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-xl font-semibold">Home Food OS</h1>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
          <NavLinks mode="desktop" showProfile={showProfile} />
        </aside>

        <div className="relative z-0 flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b bg-background/90 px-4 pb-3 pt-[max(env(safe-area-inset-top),1rem)] backdrop-blur md:hidden">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">Daily Food Assistant</p>
                <h1 className="text-lg font-semibold">Home Food OS</h1>
              </div>
              <div className="flex items-center gap-2">
                <LanguageToggle />
                <ThemeToggle />
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 p-4 pb-[calc(env(safe-area-inset-bottom)+8.75rem)] md:p-8 md:pb-8">{children}</main>
          <NavLinks mode="mobile" showProfile={showProfile} />
        </div>
      </div>
    </div>
  );
}
