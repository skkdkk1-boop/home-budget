"use client";

import Link from "next/link";

import {
  CONSTRUCTION_STATUS_TONES,
  CONSTRUCTION_STATUS_LABELS,
} from "@/lib/planner-types";
import {
  cn,
  formatCurrency,
  formatDate,
  getDeliveryScheduleMeta,
  getProjectedRemainingInsight,
} from "@/lib/planner-utils";

import { usePlannerData } from "./planner-provider";
import {
  EmptyState,
  LoadingState,
  PanelHeader,
  SummaryChip,
  StatusBadge,
  SummaryCard,
  SurfaceCard,
} from "./ui";

export function DashboardSection() {
  const { isReady, summary } = usePlannerData();

  if (!isReady) {
    return (
      <div className="page-shell">
        <LoadingState />
      </div>
    );
  }

  const projectedRemainingInsight = getProjectedRemainingInsight(
    summary.remainingProjected,
  );
  const primaryDot = (
    <span
      aria-hidden="true"
      className="h-2 w-2 shrink-0 rounded-full bg-[#2563eb]"
    />
  );
  const primaryCardClassName =
    "border-[color-mix(in_srgb,var(--border)_88%,white)] bg-[#eef4ff] shadow-none";
  const secondaryCardClassName =
    "border-[color-mix(in_srgb,var(--border)_88%,white)] bg-[#f8fafc] shadow-none";
  const secondaryValueClassName = "text-[#666666]";

  return (
    <div className="page-shell">
      <div className="radius-card border border-[color-mix(in_srgb,var(--border)_84%,white)] bg-[#f8fafc] px-4 py-3.5 sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[13px] font-medium text-[var(--text-label)]">
              자금 인사이트
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              {projectedRemainingInsight.message}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <StatusBadge tone={projectedRemainingInsight.tone}>
                {projectedRemainingInsight.label}
              </StatusBadge>
              <SummaryChip>
                월 할부 총액 {formatCurrency(summary.installmentMonthlyTotal)}
              </SummaryChip>
              <SummaryChip>
                예상 남은 자금 {formatCurrency(summary.remainingProjected)}
              </SummaryChip>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:gap-5">
        <div className="grid gap-3 md:grid-cols-2">
          <SummaryCard
            label="사용 가능 자금"
            value={formatCurrency(summary.usableFunds)}
            priority="primary"
            tone="default"
            className={primaryCardClassName}
            labelPrefix={primaryDot}
            labelClassName="text-[var(--text-secondary)]"
            valueClassName="text-[var(--primary)]"
          />
          <SummaryCard
            label="실제 남은 자금"
            value={formatCurrency(summary.remainingActual)}
            priority="primary"
            tone={summary.remainingActual < 0 ? "danger" : "default"}
            className={primaryCardClassName}
            labelPrefix={primaryDot}
            labelClassName="text-[var(--text-secondary)]"
            valueClassName={
              summary.remainingActual < 0
                ? undefined
                : "text-[var(--text-primary)]"
            }
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard
            label="총 자금"
            value={formatCurrency(summary.totalFunds)}
            priority="secondary"
            className={secondaryCardClassName}
            valueClassName={secondaryValueClassName}
          />
          <SummaryCard
            label="구매 완료 금액"
            value={formatCurrency(summary.completedPurchaseTotal)}
            priority="secondary"
            className={secondaryCardClassName}
            valueClassName={secondaryValueClassName}
          />
          <SummaryCard
            label="구매 예정 금액"
            value={formatCurrency(summary.plannedPurchaseTotal)}
            priority="secondary"
            className={secondaryCardClassName}
            valueClassName={secondaryValueClassName}
          />
        </div>

      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <SurfaceCard>
          <PanelHeader
            action={
              <Link href="/shipping" className="planner-link text-sm font-semibold">
                전체 보기
              </Link>
            }
            title="다가오는 배송 일정"
          />

          <div className="mt-4 space-y-2.5">
            {summary.upcomingShippings.length === 0 ? (
              <EmptyState
                title="예정된 배송이 없어요"
                description="배송이 필요한 품목과 날짜를 입력하면 여기서 바로 확인할 수 있어요."
              />
            ) : (
              summary.upcomingShippings.map((item) => (
                (() => {
                  const deliveryMeta = getDeliveryScheduleMeta(item.deliveryDate);

                  return (
                    <div
                      key={item.id}
                      className="planner-panel-muted flex items-start justify-between gap-4 p-3.5"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-[var(--text-primary)] sm:text-base">
                            {item.itemName}
                          </p>
                          <StatusBadge tone={deliveryMeta.tone}>
                            {deliveryMeta.label}
                          </StatusBadge>
                        </div>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          {item.room}
                        </p>
                        {item.note ? (
                          <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">
                            {item.note}
                          </p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {formatDate(item.deliveryDate)}
                        </p>
                      </div>
                    </div>
                  );
                })()
              ))
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <PanelHeader
            action={
              <Link
                href="/construction"
                className="planner-link text-sm font-semibold"
              >
                전체 보기
              </Link>
            }
            title="다가오는 시공 일정"
          />

          <div className="mt-4 space-y-2.5">
            {summary.upcomingConstructions.length === 0 ? (
              <EmptyState
                title="예정된 시공이 없어요"
                description="시공 관리를 열어서 공정과 날짜를 등록해보세요."
              />
            ) : (
              summary.upcomingConstructions.map((item) => (
                <div
                  key={item.id}
                  className="planner-panel-muted flex items-start justify-between gap-4 p-3.5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)] sm:text-base">
                        {item.name}
                      </p>
                      <StatusBadge tone={CONSTRUCTION_STATUS_TONES[item.constructionStatus]}>
                        {CONSTRUCTION_STATUS_LABELS[item.constructionStatus]}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {item.room}
                      {item.constructionCompany ? ` · ${item.constructionCompany}` : ""}
                    </p>
                    <p
                      className={cn(
                        "mt-1.5 text-sm font-semibold",
                        item.constructionTotalCost > 0
                          ? "text-[var(--text-primary)]"
                          : "text-[var(--text-muted)]",
                      )}
                    >
                      {formatCurrency(item.constructionTotalCost)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {formatDate(item.constructionDate)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {item.constructionStartTime || "시작시간 미정"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
