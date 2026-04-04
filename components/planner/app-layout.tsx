"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/planner-utils";

import {
  BoxesIcon,
  HammerIcon,
  LayoutGridIcon,
  ShoppingBagIcon,
  TruckIcon,
  WalletIcon,
} from "./nav-icons";

type NavigationItem = {
  href: string;
  label: string;
  mobileLabel: string;
  icon: typeof LayoutGridIcon;
  matchPaths?: string[];
};

const navigationItems: NavigationItem[] = [
  {
    href: "/",
    label: "대시보드",
    mobileLabel: "대시",
    icon: LayoutGridIcon,
    matchPaths: ["/"],
  },
  {
    href: "/funds",
    label: "자금 관리",
    mobileLabel: "자금",
    icon: WalletIcon,
    matchPaths: ["/funds"],
  },
  {
    href: "/purchases",
    label: "구매 관리",
    mobileLabel: "구매",
    icon: ShoppingBagIcon,
    matchPaths: ["/purchases"],
  },
  {
    href: "/shipping",
    label: "배송 관리",
    mobileLabel: "배송",
    icon: TruckIcon,
    matchPaths: ["/shipping"],
  },
  {
    href: "/construction",
    label: "시공 관리",
    mobileLabel: "시공",
    icon: HammerIcon,
    matchPaths: ["/construction"],
  },
  {
    href: "/moving-organize",
    label: "이사 정리",
    mobileLabel: "이사",
    icon: BoxesIcon,
    matchPaths: ["/moving-organize", "/moving"],
  },
];

function matchesPath(pathname: string, targetPath: string) {
  if (targetPath === "/") {
    return pathname === "/";
  }

  return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
}

function isActivePath(pathname: string, item: NavigationItem) {
  const matchPaths = item.matchPaths ?? [item.href];

  return matchPaths.some((path) => matchesPath(pathname, path));
}

export function PlannerAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "/";

  return (
    <div className="isolate min-h-screen bg-transparent text-[var(--text-primary)]">
      <header className="sticky top-0 z-[120] isolate border-b border-[color-mix(in_srgb,var(--border)_86%,white)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-[1.2rem] font-semibold tracking-[-0.03em] sm:text-[1.3rem]">
                정리 가계부
              </h1>
            </div>

            <nav className="relative z-[1] hidden flex-wrap gap-1.5 md:flex">
              {navigationItems.map((item) => {
                const active = isActivePath(pathname, item);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    aria-current={active ? "page" : undefined}
                    href={item.href}
                    className={cn(
                      "planner-tab inline-flex items-center gap-2 border border-transparent px-3.5 py-2 text-[13px] font-semibold transition",
                      active
                        ? "bg-[var(--surface-blue)] text-[var(--primary)]"
                        : "bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]",
                    )}
                  >
                    <Icon />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      <main className="planner-shell relative z-0">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-[120] border-t border-[color-mix(in_srgb,var(--border)_86%,white)] bg-[color-mix(in_srgb,var(--surface)_95%,transparent)] px-3 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] pt-2.5 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-2">
          {navigationItems.map((item) => {
            const active = isActivePath(pathname, item);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                aria-current={active ? "page" : undefined}
                href={item.href}
                className={cn(
                  "planner-tab flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-2 py-2 text-[11px] font-semibold transition",
                  active
                    ? "bg-[var(--surface-blue)] text-[var(--primary)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)]",
                )}
              >
                <Icon />
                <span>{item.mobileLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
