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
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col md:flex-row md:items-start">
      <aside className="w-full border-b bg-card/50 p-4 pt-[max(env(safe-area-inset-top),1rem)] backdrop-blur md:w-72 md:border-b-0 md:border-r md:p-6">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Home Food OS</h1>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
        <NavLinks showProfile={showProfile} />
      </aside>
      <main className="min-w-0 flex-1 p-4 pb-[max(env(safe-area-inset-bottom),2rem)] md:p-8">{children}</main>
    </div>
  );
}
