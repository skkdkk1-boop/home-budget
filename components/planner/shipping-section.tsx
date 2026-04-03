"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import type { Room, Shipping, ShippingFormValues } from "@/lib/planner-types";
import {
  ROOM_OPTIONS,
  SHIPPING_STATUS_LABELS,
  SHIPPING_STATUS_OPTIONS,
} from "@/lib/planner-types";
import {
  formatDate,
  sortShippingsByUpcoming,
  todayKey,
} from "@/lib/planner-utils";

import { usePlannerData } from "./planner-provider";
import {
  Button,
  DetailRow,
  EmptyState,
  Field,
  FormDialog,
  LoadingState,
  SectionHeader,
  SelectInput,
  StatusBadge,
  SummaryCard,
  SurfaceCard,
  TextArea,
  TextInput,
} from "./ui";

const shippingToneMap = {
  beforeOrder: "neutral",
  ordered: "info",
  shipping: "warning",
  delivered: "success",
} as const;

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
  const { data, isReady, addShipping, updateShipping, deleteShipping } =
    usePlannerData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShipping, setEditingShipping] = useState<Shipping | null>(null);
  const [form, setForm] = useState<ShippingFormValues>(createEmptyShippingForm);

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

  const sortedShippings = sortShippingsByUpcoming(data.shippings);
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

  if (!isReady) {
    return (
      <div className="page-shell">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="전체 배송 항목"
          value={`${data.shippings.length}개`}
          description="주문 전부터 배송 완료까지 연결"
        />
        <SummaryCard
          label="다가오는 일정"
          value={`${upcomingCount}건`}
          description="오늘 이후 예정일이 남아 있는 배송"
          tone="highlight"
        />
        <SummaryCard
          label="배송 중"
          value={`${inTransitCount}건`}
          description="기사 배정 또는 이동 중인 항목"
        />
        <SummaryCard
          label="배송 완료"
          value={`${deliveredCount}건`}
          description="설치까지 마친 항목"
        />
      </div>

      <SurfaceCard>
        <SectionHeader
          title="배송 목록"
          description="예정일이 빠른 순으로 정렬되어 오늘 챙겨야 할 배송을 바로 볼 수 있어요."
          action={<Button onClick={startCreate}>배송 항목 추가</Button>}
        />

        <div className="mt-5">
          {sortedShippings.length === 0 ? (
            <EmptyState
              title="등록된 배송이 없어요"
              description="구매 후 예상 배송일을 기록해두면 대시보드와 자동 연결됩니다."
            />
          ) : (
            <>
              <div className="hidden lg:block">
                <div className="table-shell">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="table-col-status">상태</th>
                        <th className="table-col-left">품목</th>
                        <th className="table-col-left">공간</th>
                        <th className="table-col-date">예정일</th>
                        <th className="table-col-left">메모</th>
                        <th className="table-col-actions">관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedShippings.map((shipping) => (
                        <tr key={shipping.id}>
                          <td className="table-col-status">
                            <StatusBadge tone={shippingToneMap[shipping.shippingStatus]}>
                              {SHIPPING_STATUS_LABELS[shipping.shippingStatus]}
                            </StatusBadge>
                          </td>
                          <td className="table-col-left font-semibold text-[var(--text-primary)]">
                            {shipping.itemName}
                          </td>
                          <td className="table-col-left text-[var(--text-secondary)]">
                            {shipping.room}
                          </td>
                          <td className="table-col-date text-[var(--text-primary)]">
                            {formatDate(shipping.expectedDate)}
                          </td>
                          <td className="table-col-left text-[var(--text-secondary)]">
                            {shipping.note || "-"}
                          </td>
                          <td className="table-col-actions">
                            <div className="table-actions">
                              <Button
                                className="table-action-button"
                                size="sm"
                                variant="secondary"
                                onClick={() => startEdit(shipping)}
                              >
                                수정
                              </Button>
                              <Button
                                className="table-action-button"
                                size="sm"
                                variant="danger"
                                onClick={() => requestDelete(shipping)}
                              >
                                삭제
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-3 lg:hidden">
                {sortedShippings.map((shipping) => (
                  <article
                    key={shipping.id}
                    className="planner-mobile-card p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge tone={shippingToneMap[shipping.shippingStatus]}>
                            {SHIPPING_STATUS_LABELS[shipping.shippingStatus]}
                          </StatusBadge>
                          <p className="text-base font-semibold text-[var(--text-primary)]">
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

                    <div className="mt-4 flex gap-2">
                      <Button
                        className="table-action-button flex-1"
                        size="sm"
                        variant="secondary"
                        onClick={() => startEdit(shipping)}
                      >
                        수정
                      </Button>
                      <Button
                        className="table-action-button flex-1"
                        size="sm"
                        variant="danger"
                        onClick={() => requestDelete(shipping)}
                      >
                        삭제
                      </Button>
                    </div>
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

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button type="submit">
              {editingShipping ? "수정 저장" : "배송 항목 추가"}
            </Button>
          </div>
        </form>
      </FormDialog>
    </div>
  );
}
