"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { Apple, Bot, ChefHat, LayoutDashboard, Receipt, ShoppingBasket, User2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { useUiStore } from "@/store/ui-store";

type NavLinksProps = {
  showProfile: boolean;
  mode?: "desktop" | "mobile";
};

type NavLink = {
  href: Route;
  icon: LucideIcon;
  labelKey:
    | "navDashboard"
    | "navInventory"
    | "navShopping"
    | "navRecipes"
    | "navReceipts"
    | "navAssistant"
    | "navProfile";
};

const links: NavLink[] = [
  { href: "/dashboard", icon: LayoutDashboard, labelKey: "navDashboard" },
  { href: "/inventory", icon: Apple, labelKey: "navInventory" },
  { href: "/receipts", icon: Receipt, labelKey: "navReceipts" },
  { href: "/shopping", icon: ShoppingBasket, labelKey: "navShopping" },
  { href: "/recipes", icon: ChefHat, labelKey: "navRecipes" },
  { href: "/assistant", icon: Bot, labelKey: "navAssistant" },
  { href: "/profile", icon: User2, labelKey: "navProfile" }
];

const mobileLinks: NavLink[] = [
  { href: "/dashboard", icon: LayoutDashboard, labelKey: "navDashboard" },
  { href: "/inventory", icon: Apple, labelKey: "navInventory" },
  { href: "/receipts", icon: Receipt, labelKey: "navReceipts" },
  { href: "/shopping", icon: ShoppingBasket, labelKey: "navShopping" },
  { href: "/recipes", icon: ChefHat, labelKey: "navRecipes" }
];

function isLinkActive(pathname: string, href: Route) {
  if (pathname === href) {
    return true;
  }

  return pathname.startsWith(`${href}/`);
}

export function NavLinks({ showProfile, mode = "desktop" }: NavLinksProps) {
  const pathname = usePathname();
  const language = useUiStore((state) => state.language);
  const navLinks = showProfile ? links : links.filter((link) => link.href !== "/profile");
  const scanLabel = t(language, "navScan");

  const prepareTabSwitch = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.dispatchEvent(new Event("home-food-os:tab-switch"));

    document.querySelectorAll("details[open]").forEach((node) => {
      node.removeAttribute("open");
    });
  };

  if (mode === "mobile") {
    return (
      <nav
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[220] border-t border-border/80 bg-background/95 px-3 pb-[max(env(safe-area-inset-bottom),0.9rem)] pt-2 backdrop-blur md:hidden"
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <div className="pointer-events-auto mx-auto flex max-w-md items-end justify-between gap-1">
          {mobileLinks.map((link) => {
            const Icon = link.icon;
            const active = isLinkActive(pathname, link.href);
            const isPrimary = link.href === "/receipts";

            return (
              <Link
                key={link.href}
                href={isPrimary ? { pathname: "/receipts", query: { capture: "1" } } : link.href}
                aria-current={active ? "page" : undefined}
                onClick={prepareTabSwitch}
                className={cn(
                  "touch-manipulation flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium text-muted-foreground/70 transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active && !isPrimary && "bg-primary text-primary-foreground shadow-sm",
                  isPrimary &&
                    "-translate-y-4 rounded-[1.4rem] bg-primary px-4 py-3 text-primary-foreground shadow-[0_18px_40px_-20px_rgba(0,0,0,0.55)]",
                  isPrimary && active && "ring-2 ring-primary/40"
                )}
              >
                <Icon className={cn(isPrimary ? "h-5 w-5" : "h-4.5 w-4.5", active && !isPrimary && "text-primary-foreground")} />
                <span className={cn("truncate", isPrimary && "text-xs")}>{isPrimary ? scanLabel : t(language, link.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

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
            onClick={prepareTabSwitch}
            className={cn(
              "touch-manipulation flex min-w-fit shrink-0 items-center gap-2 rounded-xl border border-transparent px-3 py-3.5 text-sm font-medium text-muted-foreground/80 transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active &&
                "border-primary/60 bg-primary text-primary-foreground shadow-sm md:border-primary/30 md:bg-primary/15 md:text-foreground"
            )}
          >
            <Icon className={cn("h-4 w-4", active && "text-primary-foreground md:text-primary")} />
            {t(language, link.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
