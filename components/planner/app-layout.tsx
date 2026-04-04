"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/planner-utils";

import { usePlannerAuth } from "./auth-provider";
import {
  BoxesIcon,
  HammerIcon,
  LayoutGridIcon,
  ShoppingBagIcon,
  TruckIcon,
  WalletIcon,
} from "./nav-icons";
import { Button, SummaryChip } from "./ui";

const navigationItems = [
  {
    href: "/",
    label: "대시보드",
    mobileLabel: "대시",
    icon: LayoutGridIcon,
  },
  {
    href: "/funds",
    label: "자금 관리",
    mobileLabel: "자금",
    icon: WalletIcon,
  },
  {
    href: "/purchases",
    label: "구매 관리",
    mobileLabel: "구매",
    icon: ShoppingBagIcon,
  },
  {
    href: "/shipping",
    label: "배송 관리",
    mobileLabel: "배송",
    icon: TruckIcon,
  },
  {
    href: "/construction",
    label: "시공 관리",
    mobileLabel: "시공",
    icon: HammerIcon,
  },
  {
    href: "/moving",
    label: "이사 정리",
    mobileLabel: "이사",
    icon: BoxesIcon,
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
  const { isConfigured, isReady, user, signInWithGoogle, signOut } = usePlannerAuth();
  const [pendingAction, setPendingAction] = useState<"signin" | "signout" | null>(null);

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    "로그인됨";

  async function handleSignIn() {
    try {
      setPendingAction("signin");
      await signInWithGoogle();
    } catch (error) {
      console.error(error);
      window.alert("Google 로그인 설정을 다시 확인해주세요.");
      setPendingAction(null);
    }
  }

  async function handleSignOut() {
    try {
      setPendingAction("signout");
      await signOut();
    } catch (error) {
      console.error(error);
      window.alert("로그아웃 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.");
      setPendingAction(null);
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-[var(--text-primary)]">
      <header className="sticky top-0 z-40 border-b border-[color-mix(in_srgb,var(--border)_86%,white)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-[1.2rem] font-semibold tracking-[-0.03em] sm:text-[1.3rem]">
                정리 가계부
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <nav className="hidden flex-wrap gap-1.5 md:flex">
                {navigationItems.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
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

              {isConfigured ? (
                user ? (
                  <div className="flex items-center gap-2">
                    <SummaryChip className="hidden max-w-[12rem] truncate sm:inline-flex">
                      {displayName}
                    </SummaryChip>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void handleSignOut()}
                      disabled={!isReady || pendingAction !== null}
                    >
                      {pendingAction === "signout" ? "로그아웃 중" : "로그아웃"}
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => void handleSignIn()}
                    disabled={!isReady || pendingAction !== null}
                  >
                    {pendingAction === "signin" ? "연결 중" : "Google로 로그인"}
                  </Button>
                )
              ) : (
                <SummaryChip className="hidden sm:inline-flex">
                  로그인 설정 준비 중
                </SummaryChip>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="planner-shell">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[color-mix(in_srgb,var(--border)_86%,white)] bg-[color-mix(in_srgb,var(--surface)_95%,transparent)] px-3 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] pt-2.5 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-2">
          {navigationItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
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
