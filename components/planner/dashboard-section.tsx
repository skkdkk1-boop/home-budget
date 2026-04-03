"use client";

import Link from "next/link";

import {
  CONSTRUCTION_STATUS_LABELS,
  SHIPPING_STATUS_LABELS,
} from "@/lib/planner-types";
import { cn, formatCurrency, formatDate } from "@/lib/planner-utils";

import { usePlannerData } from "./planner-provider";
import {
  EmptyState,
  LoadingState,
  StatusBadge,
  SummaryCard,
  SurfaceCard,
} from "./ui";

const shippingToneMap = {
  beforeOrder: "neutral",
  ordered: "info",
  shipping: "warning",
  delivered: "success",
} as const;

const constructionToneMap = {
  before: "neutral",
  scheduled: "info",
  done: "success",
} as const;

export function DashboardSection() {
  const { data, isReady, summary } = usePlannerData();

  if (!isReady) {
    return (
      <div className="page-shell">
        <LoadingState />
      </div>
    );
  }

  const activeShippingCount = data.shippings.filter(
    (item) => item.shippingStatus !== "delivered",
  ).length;
  const activeConstructionCount = data.constructions.filter(
    (item) => item.constructionStatus !== "done",
  ).length;

  return (
    <div className="page-shell">
      <SurfaceCard className="planner-hero-card planner-card-strong overflow-hidden">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-[var(--primary)]">
              개인 홈플래닝 보드
            </p>
            <h2 className="mt-3 text-[2rem] font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:text-[2.4rem]">
              자금, 구매, 배송, 시공을
              <br className="hidden sm:block" /> 한 화면에서 정리하는 정리 가계부
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              숫자는 크게, 상태는 가볍게, 입력은 단순하게 정리했습니다. 지금
              남은 자금과 앞으로 잡힌 일정이 바로 읽히도록 대시보드를 중심으로
              구성했어요.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/purchases"
                className="radius-control inline-flex h-11 items-center justify-center bg-[var(--primary)] px-4 text-sm font-semibold text-[#fff] shadow-[var(--shadow-primary)] transition hover:bg-[var(--primary-hover)] hover:text-[#fff] active:text-[#fff] focus-visible:text-[#fff]"
              >
                구매 항목 정리하기
              </Link>
              <Link
                href="/shipping"
                className="radius-control inline-flex h-11 items-center justify-center bg-[var(--surface-muted)] px-4 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[color-mix(in_srgb,var(--surface-muted)_82%,var(--border-strong))]"
              >
                배송 일정 확인하기
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:w-[360px] xl:grid-cols-1 2xl:grid-cols-3">
            <div className="planner-panel-muted p-4">
              <p className="text-sm text-[var(--text-secondary)]">자금 항목</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                {data.funds.length}개
              </p>
            </div>
            <div className="planner-panel-muted p-4">
              <p className="text-sm text-[var(--text-secondary)]">구매 항목</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                {data.purchases.length}개
              </p>
            </div>
            <div className="planner-panel-blue p-4">
              <p className="text-sm text-[var(--text-secondary)]">진행 중 일정</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                {activeShippingCount + activeConstructionCount}건
              </p>
            </div>
          </div>
        </div>
      </SurfaceCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="총 자금"
          value={formatCurrency(summary.totalFunds)}
          description="등록한 모든 자금의 합계"
        />
        <SummaryCard
          label="사용 가능 자금"
          value={formatCurrency(summary.usableFunds)}
          description="실제로 바로 쓸 수 있는 자금만 계산"
          tone="highlight"
        />
        <SummaryCard
          label="구매 완료 금액"
          value={formatCurrency(summary.completedPurchaseTotal)}
          description="이미 지출된 구매 합계"
        />
        <SummaryCard
          label="구매 예정 금액"
          value={formatCurrency(summary.plannedPurchaseTotal)}
          description="아직 결제 전인 구매 계획"
        />
        <SummaryCard
          label="월 할부 총액"
          value={formatCurrency(summary.installmentMonthlyTotal)}
          description="등록된 모든 할부의 월 납부 합계"
        />
        <SummaryCard
          label="실제 남은 자금"
          value={formatCurrency(summary.remainingActual)}
          description="사용 가능 자금에서 완료 구매만 차감"
          tone={summary.remainingActual < 0 ? "danger" : "highlight"}
        />
        <SummaryCard
          label="예상 남은 자금"
          value={formatCurrency(summary.remainingProjected)}
          description="완료 구매와 예정 구매를 모두 반영한 값"
          tone={summary.remainingProjected < 0 ? "danger" : "default"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SurfaceCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                다가오는 배송 일정
              </h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                가장 가까운 일정 5개를 보여줘요.
              </p>
            </div>
            <Link
              href="/shipping"
              className="planner-link text-sm font-semibold"
            >
              전체 보기
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {summary.upcomingShippings.length === 0 ? (
              <EmptyState
                title="예정된 배송이 없어요"
                description="배송 관리를 열어서 주문 전 항목이나 예정일을 추가해보세요."
              />
            ) : (
              summary.upcomingShippings.map((item) => (
                <div
                  key={item.id}
                  className="planner-panel-muted flex items-start justify-between gap-4 p-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-semibold text-[var(--text-primary)]">
                        {item.itemName}
                      </p>
                      <StatusBadge tone={shippingToneMap[item.shippingStatus]}>
                        {SHIPPING_STATUS_LABELS[item.shippingStatus]}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {item.room}
                    </p>
                    {item.note ? (
                      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                        {item.note}
                      </p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {formatDate(item.expectedDate)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">예정일</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                다가오는 시공 일정
              </h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                가까운 시공 일정 5개를 정리했어요.
              </p>
            </div>
            <Link
              href="/construction"
              className="planner-link text-sm font-semibold"
            >
              전체 보기
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {summary.upcomingConstructions.length === 0 ? (
              <EmptyState
                title="예정된 시공이 없어요"
                description="시공 관리를 열어서 공정과 날짜를 등록해보세요."
              />
            ) : (
              summary.upcomingConstructions.map((item) => (
                <div
                  key={item.id}
                  className="planner-panel-muted flex items-start justify-between gap-4 p-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-semibold text-[var(--text-primary)]">
                        {item.name}
                      </p>
                      <StatusBadge
                        tone={constructionToneMap[item.constructionStatus]}
                      >
                        {CONSTRUCTION_STATUS_LABELS[item.constructionStatus]}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {item.room}
                      {item.company ? ` · ${item.company}` : ""}
                    </p>
                    <p
                      className={cn(
                        "mt-2 text-sm font-semibold",
                        item.cost > 0
                          ? "text-[var(--text-primary)]"
                          : "text-[var(--text-muted)]",
                      )}
                    >
                      {formatCurrency(item.cost)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {formatDate(item.constructionDate)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">시공일</p>
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
