"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import {
  CONSTRUCTION_STATUS_LABELS,
  CONSTRUCTION_STATUS_TONES,
  DISPOSAL_STATUS_LABELS,
  DISPOSAL_STATUS_TONES,
  MOVE_ITEM_STATUS_LABELS,
  MOVE_ITEM_STATUS_TONES,
  PAYMENT_TYPE_LABELS,
  PURCHASE_STATUS_LABELS,
  PURCHASE_STATUS_TONES,
  SELL_ITEM_STATUS_LABELS,
  SELL_ITEM_STATUS_TONES,
  type Construction,
  type DisposalItem,
  type MoveItem,
  type PlannerData,
  type SellItem,
  type Shipping,
} from "@/lib/planner-types";
import {
  buildDashboardSummary,
  compareRecent,
  deriveConstructionsFromPurchases,
  deriveShippingsFromPurchases,
  formatCurrency,
  formatDate,
  getDeliveryScheduleMeta,
} from "@/lib/planner-utils";
import {
  isMissingPlannerSharesSetupError,
  loadPlannerShareSnapshot,
  type PlannerShareSnapshot,
} from "@/lib/planner-supabase";

import {
  EmptyState,
  LoadingState,
  PanelHeader,
  StatusBadge,
  SummaryCard,
  SummaryChip,
  SurfaceCard,
} from "./ui";

const shareDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function ReadonlySection({
  title,
  countLabel,
  emptyTitle,
  emptyDescription,
  hasContent,
  children,
}: {
  title: string;
  countLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  hasContent: boolean;
  children: ReactNode;
}) {
  return (
    <SurfaceCard>
      <PanelHeader action={<SummaryChip>{countLabel}</SummaryChip>} title={title} />
      <div className="mt-4">
        {hasContent ? (
          <div className="space-y-2.5">{children}</div>
        ) : (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        )}
      </div>
    </SurfaceCard>
  );
}

function FundRows({ data }: { data: PlannerData }) {
  if (data.funds.length === 0) {
    return null;
  }

  return [...data.funds].sort(compareRecent).map((item) => (
    <div
      key={item.id}
      className="planner-panel-muted flex items-center justify-between gap-4 p-3.5"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[var(--text-primary)] sm:text-base">
          {item.name}
        </p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {item.isUsable ? "사용 가능 자금" : "참고용 자금"}
        </p>
      </div>
      <p className="shrink-0 text-right text-sm font-semibold text-[var(--text-primary)] sm:text-base">
        {formatCurrency(item.amount)}
      </p>
    </div>
  ));
}

function PurchaseRows({ data }: { data: PlannerData }) {
  if (data.purchases.length === 0) {
    return null;
  }

  return [...data.purchases].sort(compareRecent).map((item) => (
    <div
      key={item.id}
      className="planner-panel-muted flex flex-col gap-3 p-3.5 sm:flex-row sm:items-start sm:justify-between"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-[var(--text-primary)] sm:text-base">
            {item.name}
          </p>
          <StatusBadge tone={PURCHASE_STATUS_TONES[item.status]}>
            {PURCHASE_STATUS_LABELS[item.status]}
          </StatusBadge>
        </div>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {item.room} · {item.category} · 수량 {item.quantity}
        </p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {PAYMENT_TYPE_LABELS[item.paymentType]}
          {item.paymentType === "installment" && item.installmentMonths > 0
            ? ` · ${item.installmentMonths}개월`
            : ""}
        </p>
        {item.note ? (
          <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">
            {item.note}
          </p>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold text-[var(--text-primary)] sm:text-base">
          {formatCurrency(item.totalPrice)}
        </p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          개당 {formatCurrency(item.unitPrice)}
        </p>
      </div>
    </div>
  ));
}

function ShippingRows({ items }: { items: Shipping[] }) {
  if (items.length === 0) {
    return null;
  }

  return items.map((item) => {
    const deliveryMeta = getDeliveryScheduleMeta(item.deliveryDate);

    return (
      <div
        key={item.id}
        className="planner-panel-muted flex flex-col gap-3 p-3.5 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)] sm:text-base">
              {item.itemName}
            </p>
            <StatusBadge tone={deliveryMeta.tone}>{deliveryMeta.label}</StatusBadge>
          </div>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.room}</p>
          {item.note ? (
            <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">
              {item.note}
            </p>
          ) : null}
        </div>
        <p className="shrink-0 text-right text-sm font-semibold text-[var(--text-primary)] sm:text-base">
          {formatDate(item.deliveryDate)}
        </p>
      </div>
    );
  });
}

function ConstructionRows({ items }: { items: Construction[] }) {
  if (items.length === 0) {
    return null;
  }

  return items.map((item) => (
    <div
      key={item.id}
      className="planner-panel-muted flex flex-col gap-3 p-3.5 sm:flex-row sm:items-start sm:justify-between"
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
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          시작 {item.constructionStartTime || "미정"}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold text-[var(--text-primary)] sm:text-base">
          {formatDate(item.constructionDate)}
        </p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          {formatCurrency(item.constructionTotalCost)}
        </p>
      </div>
    </div>
  ));
}

function SellRows({ items }: { items: SellItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return items.map((item) => (
    <div key={item.id} className="planner-panel-muted space-y-2 p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-[var(--text-primary)] sm:text-base">
          {item.name}
        </p>
        <StatusBadge tone={SELL_ITEM_STATUS_TONES[item.status]}>
          {SELL_ITEM_STATUS_LABELS[item.status]}
        </StatusBadge>
      </div>
      <p className="text-sm text-[var(--text-secondary)]">
        {item.currentLocation}
        {item.platform ? ` · ${item.platform}` : ""}
      </p>
      <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
        <span>희망가 {formatCurrency(item.askingPrice)}</span>
        <span>최소가 {formatCurrency(item.minimumPrice)}</span>
        {item.sellByDate ? <span>마감 {formatDate(item.sellByDate)}</span> : null}
      </div>
      {item.note ? (
        <p className="text-sm leading-6 text-[var(--text-secondary)]">{item.note}</p>
      ) : null}
    </div>
  ));
}

function DisposalRows({ items }: { items: DisposalItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return items.map((item) => (
    <div key={item.id} className="planner-panel-muted space-y-2 p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-[var(--text-primary)] sm:text-base">
          {item.name}
        </p>
        <StatusBadge tone={DISPOSAL_STATUS_TONES[item.status]}>
          {DISPOSAL_STATUS_LABELS[item.status]}
        </StatusBadge>
      </div>
      <p className="text-sm text-[var(--text-secondary)]">
        {item.currentLocation}
        {item.disposalMethod ? ` · ${item.disposalMethod}` : ""}
      </p>
      <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
        <span>{item.reservationRequired ? "예약 필요" : "예약 불필요"}</span>
        <span>비용 {formatCurrency(item.disposalCost)}</span>
        {item.disposalDate ? <span>예정일 {formatDate(item.disposalDate)}</span> : null}
      </div>
      {item.note ? (
        <p className="text-sm leading-6 text-[var(--text-secondary)]">{item.note}</p>
      ) : null}
    </div>
  ));
}

function MoveRows({ items }: { items: MoveItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return items.map((item) => (
    <div key={item.id} className="planner-panel-muted space-y-2 p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-[var(--text-primary)] sm:text-base">
          {item.name}
        </p>
        <StatusBadge tone={MOVE_ITEM_STATUS_TONES[item.status]}>
          {MOVE_ITEM_STATUS_LABELS[item.status]}
        </StatusBadge>
      </div>
      <p className="text-sm text-[var(--text-secondary)]">
        {item.currentLocation} → {item.targetLocation}
      </p>
      {item.note ? (
        <p className="text-sm leading-6 text-[var(--text-secondary)]">{item.note}</p>
      ) : null}
    </div>
  ));
}

export function SharedPlannerPage({ shareId }: { shareId: string }) {
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

  const summary = useMemo(
    () => (snapshot ? buildDashboardSummary(snapshot.data) : null),
    [snapshot],
  );
  const shippings = useMemo(
    () =>
      snapshot
        ? deriveShippingsFromPurchases(snapshot.data.purchases).sort((a, b) =>
            compareRecent(a, b),
          )
        : [],
    [snapshot],
  );
  const constructions = useMemo(
    () =>
      snapshot
        ? deriveConstructionsFromPurchases(snapshot.data.purchases).sort((a, b) =>
            compareRecent(a, b),
          )
        : [],
    [snapshot],
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
        <LoadingState />
      </div>
    );
  }

  if (!snapshot || !summary) {
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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
      <div className="space-y-6">
        <SurfaceCard className="border-[color-mix(in_srgb,var(--border)_86%,white)] bg-[#f8fafc]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[1.5rem] font-semibold tracking-[-0.035em] text-[var(--text-primary)] sm:text-[1.75rem]">
                  정리 가계부 공유
                </h1>
                <StatusBadge tone="neutral">읽기 전용</StatusBadge>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                로그인 없이 현재 공유된 스냅샷을 확인할 수 있어요. 수정은 원본 앱에서만
                가능합니다.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <SummaryChip>
                공유일 {shareDateFormatter.format(new Date(snapshot.createdAt))}
              </SummaryChip>
              <SummaryChip>
                전체 항목{" "}
                {snapshot.data.funds.length +
                  snapshot.data.purchases.length +
                  snapshot.data.sellItems.length +
                  snapshot.data.disposalItems.length +
                  snapshot.data.moveItems.length}
                개
              </SummaryChip>
            </div>
          </div>
        </SurfaceCard>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="사용 가능 자금"
            value={formatCurrency(summary.usableFunds)}
            priority="primary"
            tone="highlight"
          />
          <SummaryCard
            label="실제 남은 자금"
            value={formatCurrency(summary.remainingActual)}
            priority="primary"
            tone={summary.remainingActual < 0 ? "danger" : "default"}
          />
          <SummaryCard
            label="총 자금"
            value={formatCurrency(summary.totalFunds)}
            priority="secondary"
          />
          <SummaryCard
            label="구매 완료 금액"
            value={formatCurrency(summary.completedPurchaseTotal)}
            priority="secondary"
          />
          <SummaryCard
            label="구매 예정 금액"
            value={formatCurrency(summary.plannedPurchaseTotal)}
            priority="secondary"
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ReadonlySection
            title="자금 관리"
            countLabel={`${snapshot.data.funds.length}개`}
            emptyTitle="등록된 자금이 없어요"
            emptyDescription="공유한 시점에 저장된 자금 정보가 없어요."
            hasContent={snapshot.data.funds.length > 0}
          >
            <FundRows data={snapshot.data} />
          </ReadonlySection>

          <ReadonlySection
            title="구매 관리"
            countLabel={`${snapshot.data.purchases.length}개`}
            emptyTitle="등록된 구매 항목이 없어요"
            emptyDescription="공유한 시점에 저장된 구매 정보가 없어요."
            hasContent={snapshot.data.purchases.length > 0}
          >
            <PurchaseRows data={snapshot.data} />
          </ReadonlySection>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ReadonlySection
            title="배송 일정"
            countLabel={`${shippings.length}개`}
            emptyTitle="등록된 배송 일정이 없어요"
            emptyDescription="공유한 시점에 배송이 필요한 품목이 없어요."
            hasContent={shippings.length > 0}
          >
            <ShippingRows items={shippings} />
          </ReadonlySection>

          <ReadonlySection
            title="시공 일정"
            countLabel={`${constructions.length}개`}
            emptyTitle="등록된 시공 일정이 없어요"
            emptyDescription="공유한 시점에 시공 정보가 없어요."
            hasContent={constructions.length > 0}
          >
            <ConstructionRows items={constructions} />
          </ReadonlySection>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <ReadonlySection
            title="판매"
            countLabel={`${snapshot.data.sellItems.length}개`}
            emptyTitle="등록된 판매 항목이 없어요"
            emptyDescription="공유한 시점에 판매할 물건이 없어요."
            hasContent={snapshot.data.sellItems.length > 0}
          >
            <SellRows items={[...snapshot.data.sellItems].sort(compareRecent)} />
          </ReadonlySection>

          <ReadonlySection
            title="폐기"
            countLabel={`${snapshot.data.disposalItems.length}개`}
            emptyTitle="등록된 폐기 항목이 없어요"
            emptyDescription="공유한 시점에 폐기할 물건이 없어요."
            hasContent={snapshot.data.disposalItems.length > 0}
          >
            <DisposalRows items={[...snapshot.data.disposalItems].sort(compareRecent)} />
          </ReadonlySection>

          <ReadonlySection
            title="정리/이동"
            countLabel={`${snapshot.data.moveItems.length}개`}
            emptyTitle="등록된 이동 항목이 없어요"
            emptyDescription="공유한 시점에 이동할 물건이 없어요."
            hasContent={snapshot.data.moveItems.length > 0}
          >
            <MoveRows items={[...snapshot.data.moveItems].sort(compareRecent)} />
          </ReadonlySection>
        </div>
      </div>
    </div>
  );
}
