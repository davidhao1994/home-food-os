"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { Apple, BarChart3, Bot, ChefHat, LayoutDashboard, Receipt, ShoppingBasket, User2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { useUiStore } from "@/store/ui-store";

type NavLinksProps = {
  showProfile: boolean;
};

type NavLink = {
  href: Route;
  icon: LucideIcon;
  labelKey:
    | "navDashboard"
    | "navInventory"
    | "navShopping"
    | "navRecipes"
    | "navNutrition"
    | "navReceipts"
    | "navAssistant"
    | "navProfile";
};

const links: NavLink[] = [
  { href: "/dashboard", icon: LayoutDashboard, labelKey: "navDashboard" },
  { href: "/inventory", icon: Apple, labelKey: "navInventory" },
  { href: "/shopping", icon: ShoppingBasket, labelKey: "navShopping" },
  { href: "/recipes", icon: ChefHat, labelKey: "navRecipes" },
  { href: "/nutrition", icon: BarChart3, labelKey: "navNutrition" },
  { href: "/receipts", icon: Receipt, labelKey: "navReceipts" },
  { href: "/assistant", icon: Bot, labelKey: "navAssistant" },
  { href: "/profile", icon: User2, labelKey: "navProfile" }
];

function isLinkActive(pathname: string, href: Route) {
  if (pathname === href) {
    return true;
  }

  return pathname.startsWith(`${href}/`);
}

export function NavLinks({ showProfile }: NavLinksProps) {
  const pathname = usePathname();
  const language = useUiStore((state) => state.language);
  const navLinks = showProfile ? links : links.filter((link) => link.href !== "/profile");

  return (
    <nav className="flex gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-1 md:overflow-visible md:pb-0">
      {navLinks.map((link) => {
        const Icon = link.icon;
        const active = isLinkActive(pathname, link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "touch-manipulation flex min-w-fit shrink-0 items-center gap-2 rounded-xl border border-transparent px-3 py-3.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active &&
                "border-primary/40 bg-primary/10 text-foreground shadow-sm md:border-transparent md:bg-muted md:text-foreground"
            )}
          >
            <Icon className={cn("h-4 w-4", active && "text-primary md:text-inherit")} />
            {t(language, link.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
