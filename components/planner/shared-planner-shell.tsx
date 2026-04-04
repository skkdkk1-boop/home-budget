"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  isMissingPlannerSharesSetupError,
  loadPlannerShareSnapshot,
  type PlannerShareSnapshot,
} from "@/lib/planner-supabase";
import { cn } from "@/lib/planner-utils";

import {
  BoxesIcon,
  HammerIcon,
  LayoutGridIcon,
  ShoppingBagIcon,
  TruckIcon,
  WalletIcon,
} from "./nav-icons";
import { ReadonlyPlannerProvider } from "./readonly-planner-provider";
import { EmptyState, LoadingState, SummaryChip, SurfaceCard } from "./ui";

const sharedDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

type SharedNavigationItem = {
  href: string;
  label: string;
  mobileLabel: string;
  icon: typeof LayoutGridIcon;
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SharedPlannerShell({
  shareId,
  children,
}: {
  shareId: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [snapshot, setSnapshot] = useState<PlannerShareSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function loadShare() {
      setIsLoading(true);
      setErrorMessage("");

      const result = await loadPlannerShareSnapshot(shareId);

      if (isCancelled) {
        return;
      }

      if (result.error) {
        console.error(result.error);
        setSnapshot(null);
        setErrorMessage(
          isMissingPlannerSharesSetupError(result.error)
            ? "공유 기능 설정이 아직 완료되지 않았어요. planner_shares.sql을 먼저 실행해주세요."
            : "공유 링크를 불러오지 못했어요. 링크가 올바른지 다시 확인해주세요.",
        );
        setIsLoading(false);
        return;
      }

      if (!result.data) {
        setSnapshot(null);
        setErrorMessage("공유 링크를 찾지 못했어요. 링크가 만료되었거나 잘못되었을 수 있어요.");
        setIsLoading(false);
        return;
      }

      setSnapshot(result.data);
      setIsLoading(false);
    }

    void loadShare();

    return () => {
      isCancelled = true;
    };
  }, [shareId]);

  const basePath = `/share/${shareId}`;
  const navigationItems = useMemo<SharedNavigationItem[]>(
    () => [
      {
        href: basePath,
        label: "대시보드",
        mobileLabel: "대시",
        icon: LayoutGridIcon,
      },
      {
        href: `${basePath}/funds`,
        label: "자금 관리",
        mobileLabel: "자금",
        icon: WalletIcon,
      },
      {
        href: `${basePath}/purchases`,
        label: "구매 관리",
        mobileLabel: "구매",
        icon: ShoppingBagIcon,
      },
      {
        href: `${basePath}/shipping`,
        label: "배송 관리",
        mobileLabel: "배송",
        icon: TruckIcon,
      },
      {
        href: `${basePath}/construction`,
        label: "시공 관리",
        mobileLabel: "시공",
        icon: HammerIcon,
      },
      {
        href: `${basePath}/moving`,
        label: "이사 정리",
        mobileLabel: "이사",
        icon: BoxesIcon,
      },
    ],
    [basePath],
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
        <LoadingState />
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-10">
        <SurfaceCard>
          <EmptyState
            title="공유 내용을 불러오지 못했어요"
            description={errorMessage || "잠시 후 다시 시도해주세요."}
          />
        </SurfaceCard>
      </div>
    );
  }

  return (
    <ReadonlyPlannerProvider data={snapshot.data} routeBasePath={basePath}>
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

                <div className="hidden items-center gap-2 sm:flex">
                  <SummaryChip tone="highlight">읽기 전용 공유</SummaryChip>
                  <SummaryChip>
                    공유일 {sharedDateFormatter.format(new Date(snapshot.createdAt))}
                  </SummaryChip>
                </div>
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
    </ReadonlyPlannerProvider>
  );
}
