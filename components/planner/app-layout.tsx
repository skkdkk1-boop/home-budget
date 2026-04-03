"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/planner-utils";

import {
  HammerIcon,
  LayoutGridIcon,
  ShoppingBagIcon,
  TruckIcon,
  WalletIcon,
} from "./nav-icons";

const navigationItems = [
  {
    href: "/",
    label: "대시보드",
    mobileLabel: "대시",
    description: "자금과 일정 전체 현황을 빠르게 확인해요.",
    icon: LayoutGridIcon,
  },
  {
    href: "/funds",
    label: "자금 관리",
    mobileLabel: "자금",
    description: "사용 가능 자금을 분리해서 실제 여유 금액을 관리해요.",
    icon: WalletIcon,
  },
  {
    href: "/purchases",
    label: "구매 관리",
    mobileLabel: "구매",
    description: "공간별 구매 계획과 완료 항목, 할부 금액을 정리해요.",
    icon: ShoppingBagIcon,
  },
  {
    href: "/shipping",
    label: "배송 관리",
    mobileLabel: "배송",
    description: "다가오는 배송 일정을 놓치지 않도록 모아봐요.",
    icon: TruckIcon,
  },
  {
    href: "/construction",
    label: "시공 관리",
    mobileLabel: "시공",
    description: "시공 일정, 비용, 업체 정보를 한 화면에서 확인해요.",
    icon: HammerIcon,
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname.startsWith(href);
}

export function PlannerAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const currentItem =
    navigationItems.find((item) => isActivePath(pathname, item.href)) ??
    navigationItems[0];

  return (
    <div className="min-h-screen bg-transparent text-[var(--text-primary)]">
      <header className="sticky top-0 z-40 border-b border-[color-mix(in_srgb,var(--border)_86%,white)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">
                Home Planning Ledger
              </p>
              <h1 className="mt-1 truncate text-[1.4rem] font-semibold tracking-[-0.03em]">
                정리 가계부
              </h1>
            </div>

            <nav className="hidden flex-wrap gap-2 md:flex">
              {navigationItems.map((item) => {
                const active = isActivePath(pathname, item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "planner-tab inline-flex items-center gap-2.5 border border-transparent px-4 py-2.5 text-sm font-semibold transition",
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

          <div className="mt-5">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {currentItem.label}
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              {currentItem.description}
            </p>
          </div>
        </div>
      </header>

      <main className="planner-shell">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[color-mix(in_srgb,var(--border)_86%,white)] bg-[color-mix(in_srgb,var(--surface)_95%,transparent)] px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-2">
          {navigationItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "planner-tab flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 px-2 py-2.5 text-[11px] font-semibold transition",
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
