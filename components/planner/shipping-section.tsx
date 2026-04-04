"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import type {
  Purchase,
  PurchaseFormValues,
  Shipping,
} from "@/lib/planner-types";
import { ROOM_OPTIONS } from "@/lib/planner-types";
import {
  deriveShippingsFromPurchases,
  formatDate,
  getDeliveryScheduleMeta,
  keepVisibleSelections,
  sortShippingsByUpcoming,
  toggleAllVisibleSelections,
  toggleSelectionItem,
  todayKey,
} from "@/lib/planner-utils";

import { usePlannerData } from "./planner-provider";
import {
  BulkActionBar,
  Button,
  DetailRow,
  DialogActions,
  EmptyState,
  Field,
  FormDialog,
  LoadingState,
  RowActionMenu,
  SelectionCheckbox,
  SectionHeader,
  SelectInput,
  StatusBadge,
  SummaryCard,
  SurfaceCard,
  TableContainer,
  TextArea,
  TextInput,
} from "./ui";

type ShippingFormState = {
  itemName: string;
  room: PurchaseFormValues["room"];
  deliveryDate: string;
  note: string;
};

function createEmptyShippingForm(): ShippingFormState {
  return {
    itemName: "",
    room: ROOM_OPTIONS[0],
    deliveryDate: todayKey(),
    note: "",
  };
}

export function ShippingSection() {
  const {
    data,
    isReady,
    isReadOnly,
    addPurchase,
    updatePurchase,
  } = usePlannerData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShipping, setEditingShipping] = useState<Shipping | null>(null);
  const [form, setForm] = useState<ShippingFormState>(createEmptyShippingForm);
  const [selectedShippingIds, setSelectedShippingIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isDialogOpen) {
      setEditingShipping(null);
      setForm(createEmptyShippingForm());
      return;
    }

    if (editingShipping) {
      setForm({
        itemName: editingShipping.itemName,
        room: editingShipping.room,
        deliveryDate: editingShipping.deliveryDate,
        note: editingShipping.note,
      });
      return;
    }

    setForm(createEmptyShippingForm());
  }, [editingShipping, isDialogOpen]);

  const sortedShippings = useMemo(
    () => sortShippingsByUpcoming(deriveShippingsFromPurchases(data.purchases)),
    [data.purchases],
  );
  const visibleShippingIds = useMemo(
    () => sortedShippings.map((item) => item.id),
    [sortedShippings],
  );
  const selectedVisibleCount = visibleShippingIds.filter((id) =>
    selectedShippingIds.includes(id),
  ).length;
  const isAllVisibleSelected =
    visibleShippingIds.length > 0 &&
    visibleShippingIds.every((id) => selectedShippingIds.includes(id));
  const isSomeVisibleSelected =
    selectedVisibleCount > 0 && !isAllVisibleSelected;
  const today = todayKey();
  const upcomingCount = sortedShippings.filter(
    (item) => item.deliveryDate > today,
  ).length;
  const todayCount = sortedShippings.filter(
    (item) => item.deliveryDate === today,
  ).length;
  const overdueCount = sortedShippings.filter(
    (item) => item.deliveryDate < today,
  ).length;
  const buildPurchaseInput = (
    basePurchase: Purchase | null,
    overrides: Partial<ShippingFormState & { deliveryRequired: boolean }>,
  ): PurchaseFormValues => ({
    status: basePurchase?.status ?? "planned",
    room: overrides.room ?? basePurchase?.room ?? ROOM_OPTIONS[0],
    category: basePurchase?.category ?? "기타",
    name: overrides.itemName ?? basePurchase?.name ?? "",
    unitPrice: basePurchase?.unitPrice ?? 0,
    quantity: basePurchase?.quantity ?? 1,
    paymentType: basePurchase?.paymentType ?? "lump",
    installmentMonths:
      basePurchase?.paymentType === "installment"
        ? basePurchase.installmentMonths
        : 12,
    link: basePurchase?.link ?? "",
    note: overrides.note ?? basePurchase?.note ?? "",
    deliveryRequired: overrides.deliveryRequired ?? basePurchase?.deliveryRequired ?? true,
    deliveryDate: overrides.deliveryDate ?? basePurchase?.deliveryDate ?? todayKey(),
    constructionRequired: basePurchase?.constructionRequired ?? false,
    constructionStatus: basePurchase?.constructionStatus,
    constructionDate: basePurchase?.constructionDate ?? "",
    constructionStartTime: basePurchase?.constructionStartTime ?? "",
    constructionCompany: basePurchase?.constructionCompany ?? "",
    constructionTotalCost: basePurchase?.constructionTotalCost ?? 0,
    constructionDeposit: basePurchase?.constructionDeposit ?? 0,
    constructionBalance: basePurchase?.constructionBalance ?? 0,
  });

  const startCreate = () => {
    setEditingShipping(null);
    setIsDialogOpen(true);
  };

  const startEdit = (shipping: Shipping) => {
    setEditingShipping(shipping);
    setIsDialogOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const existingPurchase = editingShipping
      ? data.purchases.find((item) => item.id === editingShipping.id) ?? null
      : null;

    if (editingShipping) {
      updatePurchase(
        editingShipping.id,
        buildPurchaseInput(existingPurchase, {
          itemName: form.itemName,
          room: form.room,
          note: form.note,
          deliveryRequired: true,
          deliveryDate: form.deliveryDate,
        }),
      );
    } else {
      addPurchase(
        buildPurchaseInput(null, {
          itemName: form.itemName,
          room: form.room,
          note: form.note,
          deliveryRequired: true,
          deliveryDate: form.deliveryDate,
        }),
      );
    }

    setIsDialogOpen(false);
  };

  const requestDelete = (shipping: Shipping) => {
    if (window.confirm(`"${shipping.itemName}" 배송 항목을 삭제할까요?`)) {
      const existingPurchase =
        data.purchases.find((item) => item.id === shipping.id) ?? null;

      if (!existingPurchase) {
        return;
      }

      updatePurchase(
        shipping.id,
        buildPurchaseInput(existingPurchase, {
          deliveryRequired: false,
          deliveryDate: "",
        }),
      );
    }
  };

  useEffect(() => {
    setSelectedShippingIds((current) => {
      const next = keepVisibleSelections(current, visibleShippingIds);

      if (
        current.length === next.length &&
        current.every((id, index) => id === next[index])
      ) {
        return current;
      }

      return next;
    });
  }, [visibleShippingIds]);

  const toggleShippingSelection = (shippingId: string) => {
    setSelectedShippingIds((current) =>
      toggleSelectionItem(current, shippingId),
    );
  };

  const toggleSelectAllShippings = () => {
    setSelectedShippingIds((current) =>
      toggleAllVisibleSelections(
        current,
        visibleShippingIds,
        isAllVisibleSelected,
      ),
    );
  };

  const clearShippingSelection = () => {
    setSelectedShippingIds([]);
  };

  const handleBulkDeleteShippings = () => {
    if (selectedShippingIds.length === 0) {
      return;
    }

    if (
      window.confirm(
        `선택한 ${selectedShippingIds.length}개 항목을 삭제할까요?`,
      )
    ) {
      selectedShippingIds.forEach((id) => {
        const existingPurchase = data.purchases.find((item) => item.id === id) ?? null;

        if (!existingPurchase) {
          return;
        }

        updatePurchase(
          id,
          buildPurchaseInput(existingPurchase, {
            deliveryRequired: false,
            deliveryDate: "",
          }),
        );
      });
      clearShippingSelection();
    }
  };

  if (!isReady) {
    return (
      <div className="page-shell">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="전체 배송 항목"
          value={`${sortedShippings.length}개`}
        />
        <SummaryCard
          label="다가오는 일정"
          value={`${upcomingCount}건`}
          tone="highlight"
        />
        <SummaryCard
          label="오늘 배송"
          value={`${todayCount}건`}
        />
        <SummaryCard
          label="지난 일정"
          value={`${overdueCount}건`}
        />
      </div>

      <SurfaceCard>
        <SectionHeader
          action={!isReadOnly ? <Button onClick={startCreate}>배송 항목 추가</Button> : undefined}
        />

        {!isReadOnly && selectedShippingIds.length > 0 ? (
          <div className="mt-4">
            <BulkActionBar
              count={selectedShippingIds.length}
              onClear={clearShippingSelection}
            >
              <Button size="sm" variant="danger" onClick={handleBulkDeleteShippings}>
                선택 삭제
              </Button>
            </BulkActionBar>
          </div>
        ) : null}

        <div className="mt-4">
          {sortedShippings.length === 0 ? (
            <EmptyState
              title="등록된 배송이 없어요"
              description="배송이 필요한 품목에 날짜만 입력해두면 배송 관리와 대시보드에 바로 반영됩니다."
            />
          ) : (
            <>
              <div className="hidden lg:block">
                <TableContainer>
                  <table className="data-table">
                    <thead>
                      <tr>
                        {!isReadOnly ? (
                          <th className="table-col-select">
                            <div className="table-action-slot">
                              <SelectionCheckbox
                                aria-label="현재 목록 전체 선택"
                                checked={isAllVisibleSelected}
                                indeterminate={isSomeVisibleSelected}
                                onChange={() => toggleSelectAllShippings()}
                              />
                            </div>
                          </th>
                        ) : null}
                        <th className="table-col-status">상태</th>
                        <th className="table-col-left">품목</th>
                        <th className="table-col-left">공간</th>
                        <th className="table-col-date">배송일</th>
                        <th className="table-col-left">메모</th>
                        {!isReadOnly ? (
                          <th className="table-col-actions">
                            <span className="sr-only">행 동작</span>
                          </th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedShippings.map((shipping) => {
                        const deliveryMeta = getDeliveryScheduleMeta(shipping.deliveryDate);

                        return (
                          <tr key={shipping.id}>
                            {!isReadOnly ? (
                              <td className="table-col-select">
                                <div className="table-action-slot">
                                  <SelectionCheckbox
                                    aria-label={`${shipping.itemName} 선택`}
                                    checked={selectedShippingIds.includes(shipping.id)}
                                    onChange={() => toggleShippingSelection(shipping.id)}
                                  />
                                </div>
                              </td>
                            ) : null}
                            <td className="table-col-status">
                              <StatusBadge tone={deliveryMeta.tone}>
                                {deliveryMeta.label}
                              </StatusBadge>
                            </td>
                            <td className="table-col-left">
                              <p className="table-cell-title">{shipping.itemName}</p>
                            </td>
                            <td className="table-col-left text-[var(--text-secondary)]">
                              {shipping.room}
                            </td>
                            <td className="table-col-date text-[var(--text-primary)]">
                              {formatDate(shipping.deliveryDate)}
                            </td>
                            <td className="table-col-left text-[var(--text-secondary)]">
                              {shipping.note ? (
                                <p className="table-cell-note max-w-[20rem]">
                                  {shipping.note}
                                </p>
                              ) : (
                                "-"
                              )}
                            </td>
                            {!isReadOnly ? (
                              <td className="table-col-actions">
                                <div className="table-action-slot">
                                  <RowActionMenu
                                    description={`${shipping.room} · ${formatDate(shipping.deliveryDate)}`}
                                    label={shipping.itemName}
                                    mode="desktop"
                                    onDelete={() => requestDelete(shipping)}
                                    onEdit={() => startEdit(shipping)}
                                  />
                                </div>
                              </td>
                            ) : null}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </TableContainer>
              </div>

              <div className="grid gap-3 lg:hidden">
                {sortedShippings.map((shipping) => {
                  const deliveryMeta = getDeliveryScheduleMeta(shipping.deliveryDate);

                  return (
                    <article
                      key={shipping.id}
                      className="planner-mobile-card relative p-4 sm:p-5"
                    >
                      {!isReadOnly ? (
                        <div className="absolute left-4 top-4 z-10">
                          <SelectionCheckbox
                            aria-label={`${shipping.itemName} 선택`}
                            checked={selectedShippingIds.includes(shipping.id)}
                            onChange={() => toggleShippingSelection(shipping.id)}
                          />
                        </div>
                      ) : null}

                      <div className={isReadOnly ? "pr-4" : "pl-8 pr-12"}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge tone={deliveryMeta.tone}>
                                {deliveryMeta.label}
                              </StatusBadge>
                              <p className="table-cell-title text-base">
                                {shipping.itemName}
                              </p>
                            </div>
                            <p className="mt-2 text-sm text-[var(--text-secondary)]">
                              {shipping.room}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">
                              {formatDate(shipping.deliveryDate)}
                            </p>
                            <p className="mt-1 text-xs text-[var(--text-muted)]">배송일</p>
                          </div>
                        </div>

                        <div className="mt-4 space-y-3">
                          <DetailRow
                            label="메모"
                            value={shipping.note || "-"}
                          />
                        </div>
                      </div>

                      {!isReadOnly ? (
                        <RowActionMenu
                          description={`${shipping.room} · ${formatDate(shipping.deliveryDate)}`}
                          label={shipping.itemName}
                          mode="mobile"
                          onDelete={() => requestDelete(shipping)}
                          onEdit={() => startEdit(shipping)}
                          triggerClassName="absolute right-4 top-4"
                        />
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </SurfaceCard>

      {!isReadOnly ? (
        <FormDialog
          open={isDialogOpen}
          title={editingShipping ? "배송 항목 수정" : "배송 항목 추가"}
          description="배송이 필요한 품목만 날짜를 남기면 다른 배송 정보 없이도 일정 관리에 바로 쓸 수 있어요."
          onClose={() => setIsDialogOpen(false)}
        >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Field label="품목 이름">
            <TextInput
              required
              placeholder="예: 식탁"
              value={form.itemName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  itemName: event.target.value,
                }))
              }
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="공간">
              <SelectInput
                value={form.room}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    room: event.target.value as PurchaseFormValues["room"],
                  }))
                }
              >
                {ROOM_OPTIONS.map((room) => (
                  <option key={room} value={room}>
                    {room}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label="배송일">
              <TextInput
                required
                type="date"
                value={form.deliveryDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    deliveryDate: event.target.value,
                  }))
                }
              />
            </Field>
          </div>

          <Field label="메모">
            <TextArea
              placeholder="엘리베이터 예약, 기사 요청사항 등을 적어두세요."
              value={form.note}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  note: event.target.value,
                }))
              }
            />
          </Field>

          <DialogActions
            onCancel={() => setIsDialogOpen(false)}
            submitLabel={editingShipping ? "수정 저장" : "배송 항목 추가"}
          />
        </form>
        </FormDialog>
      ) : null}
    </div>
  );
}
