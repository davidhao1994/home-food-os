import Link from "next/link";
import type { Route } from "next";
import { ReactNode } from "react";
import { Apple, BarChart3, Bot, ChefHat, LayoutDashboard, Receipt, ShoppingBasket, User2, type LucideIcon } from "lucide-react";
import { isFamilyDemoModeEnabled } from "@/lib/family-demo";
import { ThemeToggle } from "@/components/layout/theme-toggle";

type AppShellProps = {
  children: ReactNode;
};

const links: Array<{ href: Route; label: string; icon: LucideIcon }> = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: Apple },
  { href: "/shopping", label: "Shopping", icon: ShoppingBasket },
  { href: "/recipes", label: "Recipes", icon: ChefHat },
  { href: "/nutrition", label: "Nutrition", icon: BarChart3 },
  { href: "/receipts", label: "Receipts", icon: Receipt },
  { href: "/assistant", label: "AI Assistant", icon: Bot },
  { href: "/profile", label: "Profile", icon: User2 }
];

export function AppShell({ children }: AppShellProps) {
  const navLinks = isFamilyDemoModeEnabled()
    ? links.filter((link) => link.href !== "/profile")
    : links;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col md:flex-row md:items-start">
      <aside className="w-full border-b bg-card/50 p-4 backdrop-blur md:w-72 md:border-b-0 md:border-r md:p-6">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Home Food OS</h1>
          <ThemeToggle />
        </div>
        <nav className="flex gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-1 md:overflow-visible md:pb-0">
          {navLinks.map((link) => {
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                className="touch-manipulation flex min-w-fit shrink-0 items-center gap-2 rounded-xl px-3 py-3.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-4 pb-8 md:p-8">{children}</main>
    </div>
  );
}
