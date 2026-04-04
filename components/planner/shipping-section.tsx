"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import type { Room, Shipping, ShippingFormValues } from "@/lib/planner-types";
import {
  ROOM_OPTIONS,
  SHIPPING_STATUS_LABELS,
  SHIPPING_STATUS_OPTIONS,
  SHIPPING_STATUS_TONES,
} from "@/lib/planner-types";
import {
  formatDate,
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

function createEmptyShippingForm(): ShippingFormValues {
  return {
    itemName: "",
    room: ROOM_OPTIONS[0],
    shippingStatus: SHIPPING_STATUS_OPTIONS[0],
    expectedDate: todayKey(),
    note: "",
  };
}

export function ShippingSection() {
  const {
    data,
    isReady,
    addShipping,
    updateShipping,
    deleteShipping,
    deleteShippings,
  } = usePlannerData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShipping, setEditingShipping] = useState<Shipping | null>(null);
  const [form, setForm] = useState<ShippingFormValues>(createEmptyShippingForm);
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
        shippingStatus: editingShipping.shippingStatus,
        expectedDate: editingShipping.expectedDate,
        note: editingShipping.note,
      });
      return;
    }

    setForm(createEmptyShippingForm());
  }, [editingShipping, isDialogOpen]);

  const sortedShippings = useMemo(
    () => sortShippingsByUpcoming(data.shippings),
    [data.shippings],
  );
  const visibleShippingIds = sortedShippings.map((item) => item.id);
  const selectedVisibleCount = visibleShippingIds.filter((id) =>
    selectedShippingIds.includes(id),
  ).length;
  const isAllVisibleSelected =
    visibleShippingIds.length > 0 &&
    visibleShippingIds.every((id) => selectedShippingIds.includes(id));
  const isSomeVisibleSelected =
    selectedVisibleCount > 0 && !isAllVisibleSelected;
  const today = todayKey();
  const upcomingCount = data.shippings.filter(
    (item) => item.shippingStatus !== "delivered" && item.expectedDate >= today,
  ).length;
  const inTransitCount = data.shippings.filter(
    (item) => item.shippingStatus === "shipping",
  ).length;
  const deliveredCount = data.shippings.filter(
    (item) => item.shippingStatus === "delivered",
  ).length;

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

    if (editingShipping) {
      updateShipping(editingShipping.id, form);
    } else {
      addShipping(form);
    }

    setIsDialogOpen(false);
  };

  const requestDelete = (shipping: Shipping) => {
    if (window.confirm(`"${shipping.itemName}" 배송 항목을 삭제할까요?`)) {
      deleteShipping(shipping.id);
    }
  };

  useEffect(() => {
    setSelectedShippingIds((current) =>
      keepVisibleSelections(
        current,
        sortedShippings.map((item) => item.id),
      ),
    );
  }, [sortedShippings]);

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
      deleteShippings(selectedShippingIds);
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
          value={`${data.shippings.length}개`}
        />
        <SummaryCard
          label="다가오는 일정"
          value={`${upcomingCount}건`}
          tone="highlight"
        />
        <SummaryCard
          label="배송 중"
          value={`${inTransitCount}건`}
        />
        <SummaryCard
          label="배송 완료"
          value={`${deliveredCount}건`}
        />
      </div>

      <SurfaceCard>
        <SectionHeader action={<Button onClick={startCreate}>배송 항목 추가</Button>} />

        {selectedShippingIds.length > 0 ? (
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
              description="구매 후 예상 배송일을 기록해두면 대시보드와 자동 연결됩니다."
            />
          ) : (
            <>
              <div className="hidden lg:block">
                <TableContainer>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="table-col-select">
                          <div className="table-action-slot">
                            <SelectionCheckbox
                              aria-label="현재 목록 전체 선택"
                              checked={isAllVisibleSelected}
                              indeterminate={isSomeVisibleSelected}
                              onChange={toggleSelectAllShippings}
                            />
                          </div>
                        </th>
                        <th className="table-col-status">상태</th>
                        <th className="table-col-left">품목</th>
                        <th className="table-col-left">공간</th>
                        <th className="table-col-date">예정일</th>
                        <th className="table-col-left">메모</th>
                        <th className="table-col-actions">
                          <span className="sr-only">행 동작</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedShippings.map((shipping) => (
                        <tr key={shipping.id}>
                          <td className="table-col-select">
                            <div className="table-action-slot">
                              <SelectionCheckbox
                                aria-label={`${shipping.itemName} 선택`}
                                checked={selectedShippingIds.includes(shipping.id)}
                                onChange={() => toggleShippingSelection(shipping.id)}
                              />
                            </div>
                          </td>
                          <td className="table-col-status">
                            <StatusBadge tone={SHIPPING_STATUS_TONES[shipping.shippingStatus]}>
                              {SHIPPING_STATUS_LABELS[shipping.shippingStatus]}
                            </StatusBadge>
                          </td>
                          <td className="table-col-left">
                            <p className="table-cell-title">{shipping.itemName}</p>
                          </td>
                          <td className="table-col-left text-[var(--text-secondary)]">
                            {shipping.room}
                          </td>
                          <td className="table-col-date text-[var(--text-primary)]">
                            {formatDate(shipping.expectedDate)}
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
                          <td className="table-col-actions">
                            <div className="table-action-slot">
                              <RowActionMenu
                                description={`${shipping.room} · ${formatDate(shipping.expectedDate)}`}
                                label={shipping.itemName}
                                mode="desktop"
                                onDelete={() => requestDelete(shipping)}
                                onEdit={() => startEdit(shipping)}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableContainer>
              </div>

              <div className="grid gap-3 lg:hidden">
                {sortedShippings.map((shipping) => (
                  <article
                    key={shipping.id}
                    className="planner-mobile-card relative p-4 sm:p-5"
                  >
                    <div className="absolute left-4 top-4 z-10">
                      <SelectionCheckbox
                        aria-label={`${shipping.itemName} 선택`}
                        checked={selectedShippingIds.includes(shipping.id)}
                        onChange={() => toggleShippingSelection(shipping.id)}
                      />
                    </div>

                    <div className="pl-8 pr-12">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge tone={SHIPPING_STATUS_TONES[shipping.shippingStatus]}>
                              {SHIPPING_STATUS_LABELS[shipping.shippingStatus]}
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
                            {formatDate(shipping.expectedDate)}
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">예정일</p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        <DetailRow
                          label="메모"
                          value={shipping.note || "-"}
                        />
                      </div>
                    </div>

                    <RowActionMenu
                      description={`${shipping.room} · ${formatDate(shipping.expectedDate)}`}
                      label={shipping.itemName}
                      mode="mobile"
                      onDelete={() => requestDelete(shipping)}
                      onEdit={() => startEdit(shipping)}
                      triggerClassName="absolute right-4 top-4"
                    />
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </SurfaceCard>

      <FormDialog
        open={isDialogOpen}
        title={editingShipping ? "배송 항목 수정" : "배송 항목 추가"}
        description="주문 단계와 예정일을 입력하면 대시보드 일정에도 자동 반영됩니다."
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

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="공간">
              <SelectInput
                value={form.room}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    room: event.target.value as Room,
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

            <Field label="배송 상태">
              <SelectInput
                value={form.shippingStatus}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    shippingStatus: event.target.value as ShippingFormValues["shippingStatus"],
                  }))
                }
              >
                {SHIPPING_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {SHIPPING_STATUS_LABELS[status]}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label="예상 배송일">
              <TextInput
                required
                type="date"
                value={form.expectedDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    expectedDate: event.target.value,
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
    </div>
  );
}
