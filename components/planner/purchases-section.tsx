"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

import type {
  Purchase,
  PurchaseCategory,
  PurchaseFormValues,
  PurchaseSortOption,
  PurchaseStatus,
  Room,
} from "@/lib/planner-types";
import {
  PAYMENT_TYPE_LABELS,
  PURCHASE_CATEGORY_OPTIONS,
  PURCHASE_STATUS_LABELS,
  ROOM_OPTIONS,
} from "@/lib/planner-types";
import {
  calculatePurchaseAmounts,
  compareRecent,
  formatCurrency,
} from "@/lib/planner-utils";

import { usePlannerData } from "./planner-provider";
import {
  Button,
  DetailRow,
  EmptyState,
  Field,
  FormDialog,
  LoadingState,
  SelectInput,
  SectionHeader,
  StatusBadge,
  SummaryCard,
  SurfaceCard,
  TextArea,
  TextInput,
} from "./ui";

const emptyPurchaseForm: PurchaseFormValues = {
  status: "planned",
  room: ROOM_OPTIONS[0],
  category: PURCHASE_CATEGORY_OPTIONS[0],
  name: "",
  unitPrice: 0,
  quantity: 1,
  paymentType: "lump",
  installmentMonths: 12,
  link: "",
  note: "",
};

const purchaseToneMap = {
  planned: "warning",
  completed: "success",
} as const;

export function PurchasesSection() {
  const { data, isReady, addPurchase, updatePurchase, deletePurchase } =
    usePlannerData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [form, setForm] = useState<PurchaseFormValues>(emptyPurchaseForm);
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [roomFilter, setRoomFilter] = useState<Room | "all">("all");
  const [categoryFilter, setCategoryFilter] =
    useState<PurchaseCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<PurchaseStatus | "all">("all");
  const [sortBy, setSortBy] = useState<PurchaseSortOption>("recent");

  useEffect(() => {
    if (!isDialogOpen) {
      setEditingPurchase(null);
      setForm(emptyPurchaseForm);
      return;
    }

    if (editingPurchase) {
      setForm({
        status: editingPurchase.status,
        room: editingPurchase.room,
        category: editingPurchase.category,
        name: editingPurchase.name,
        unitPrice: editingPurchase.unitPrice,
        quantity: editingPurchase.quantity,
        paymentType: editingPurchase.paymentType,
        installmentMonths:
          editingPurchase.installmentMonths > 0
            ? editingPurchase.installmentMonths
            : 12,
        link: editingPurchase.link,
        note: editingPurchase.note,
      });
      return;
    }

    setForm(emptyPurchaseForm);
  }, [editingPurchase, isDialogOpen]);

  const filteredPurchases = useMemo(() => {
    const normalizedSearch = deferredSearchTerm.trim().toLowerCase();
    const nextItems = data.purchases.filter((item) => {
      const matchesSearch = normalizedSearch
        ? item.name.toLowerCase().includes(normalizedSearch)
        : true;
      const matchesRoom = roomFilter === "all" ? true : item.room === roomFilter;
      const matchesCategory =
        categoryFilter === "all" ? true : item.category === categoryFilter;
      const matchesStatus =
        statusFilter === "all" ? true : item.status === statusFilter;

      return matchesSearch && matchesRoom && matchesCategory && matchesStatus;
    });

    nextItems.sort((left, right) => {
      if (sortBy === "priceHigh") {
        return right.totalPrice - left.totalPrice || compareRecent(left, right);
      }

      if (sortBy === "priceLow") {
        return left.totalPrice - right.totalPrice || compareRecent(left, right);
      }

      return compareRecent(left, right);
    });

    return nextItems;
  }, [categoryFilter, data.purchases, deferredSearchTerm, roomFilter, sortBy, statusFilter]);

  const draftAmounts = calculatePurchaseAmounts(form);
  const filteredTotal = filteredPurchases.reduce(
    (sum, item) => sum + item.totalPrice,
    0,
  );
  const completedCount = data.purchases.filter(
    (item) => item.status === "completed",
  ).length;
  const plannedCount = data.purchases.filter(
    (item) => item.status === "planned",
  ).length;

  const startCreate = () => {
    setEditingPurchase(null);
    setIsDialogOpen(true);
  };

  const startEdit = (purchase: Purchase) => {
    setEditingPurchase(purchase);
    setIsDialogOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (editingPurchase) {
      updatePurchase(editingPurchase.id, form);
    } else {
      addPurchase(form);
    }

    setIsDialogOpen(false);
  };

  const requestDelete = (purchase: Purchase) => {
    if (window.confirm(`"${purchase.name}" 항목을 삭제할까요?`)) {
      deletePurchase(purchase.id);
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setRoomFilter("all");
    setCategoryFilter("all");
    setStatusFilter("all");
    setSortBy("recent");
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
          label="전체 구매 항목"
          value={`${data.purchases.length}개`}
          description="계획과 완료 항목을 함께 관리"
        />
        <SummaryCard
          label="필터 결과"
          value={`${filteredPurchases.length}개`}
          description={`현재 목록 합계 ${formatCurrency(filteredTotal)}`}
        />
        <SummaryCard
          label="구매 완료"
          value={`${completedCount}개`}
          description="지출이 끝난 항목 수"
        />
        <SummaryCard
          label="구매 예정"
          value={`${plannedCount}개`}
          description="앞으로 결정하거나 결제할 항목 수"
          tone="highlight"
        />
      </div>

      <SurfaceCard>
        <SectionHeader
          title="구매 목록"
          description="이름 검색, 공간/분류/상태 필터, 최근순 또는 가격순 정렬을 한 번에 사용할 수 있어요."
          action={<Button onClick={startCreate}>구매 항목 추가</Button>}
        />

        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-[minmax(13rem,1.5fr)_repeat(4,minmax(7rem,0.92fr))_auto] lg:items-end">
          <div className="min-w-0">
            <Field label="품목 검색">
              <TextInput
                placeholder="예: 냉장고"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </Field>
          </div>

          <div className="min-w-0">
            <Field label="공간">
              <SelectInput
                value={roomFilter}
                onChange={(event) => setRoomFilter(event.target.value as Room | "all")}
              >
                <option value="all">전체 공간</option>
                {ROOM_OPTIONS.map((room) => (
                  <option key={room} value={room}>
                    {room}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>

          <div className="min-w-0">
            <Field label="분류">
              <SelectInput
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value as PurchaseCategory | "all")
                }
              >
                <option value="all">전체 분류</option>
                {PURCHASE_CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>

          <div className="min-w-0">
            <Field label="상태">
              <SelectInput
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as PurchaseStatus | "all")
                }
              >
                <option value="all">전체 상태</option>
                <option value="planned">구매 예정</option>
                <option value="completed">구매 완료</option>
              </SelectInput>
            </Field>
          </div>

          <div className="min-w-0">
            <Field label="정렬">
              <SelectInput
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value as PurchaseSortOption)
                }
              >
                <option value="recent">최근 등록순</option>
                <option value="priceHigh">높은 금액순</option>
                <option value="priceLow">낮은 금액순</option>
              </SelectInput>
            </Field>
          </div>

          <Button
            className="w-full lg:h-12 lg:w-auto lg:min-w-[6.75rem]"
            variant="secondary"
            onClick={resetFilters}
          >
            필터 초기화
          </Button>
        </div>

        <div className="mt-5">
          {filteredPurchases.length === 0 ? (
            <EmptyState
              title="조건에 맞는 구매 항목이 없어요"
              description="검색어나 필터를 조정하거나 새로운 구매 항목을 추가해보세요."
            />
          ) : (
            <>
              <div className="hidden xl:block">
                <div className="table-shell">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="table-col-status">상태</th>
                        <th className="table-col-left">품목</th>
                        <th className="table-col-left">공간 / 분류</th>
                        <th className="table-col-qty">수량</th>
                        <th className="table-col-amount">총액</th>
                        <th className="table-col-payment">결제</th>
                        <th className="table-col-link">링크</th>
                        <th className="table-col-actions">관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPurchases.map((purchase) => (
                        <tr key={purchase.id}>
                          <td className="table-col-status">
                            <StatusBadge tone={purchaseToneMap[purchase.status]}>
                              {PURCHASE_STATUS_LABELS[purchase.status]}
                            </StatusBadge>
                          </td>
                          <td className="table-col-left">
                            <p className="font-semibold text-[var(--text-primary)]">
                              {purchase.name}
                            </p>
                            {purchase.note ? (
                              <p className="mt-1 max-w-[280px] truncate text-sm leading-6 text-[var(--text-secondary)]">
                                {purchase.note}
                              </p>
                            ) : null}
                          </td>
                          <td className="table-col-left text-[var(--text-secondary)]">
                            {purchase.room} · {purchase.category}
                          </td>
                          <td className="table-col-qty text-[var(--text-secondary)]">
                            {purchase.quantity}개
                          </td>
                          <td className="table-col-amount">
                            <p className="font-semibold text-[var(--text-primary)]">
                              {formatCurrency(purchase.totalPrice)}
                            </p>
                            <p className="mt-1 text-[var(--text-secondary)]">
                              {formatCurrency(purchase.unitPrice)} × {purchase.quantity}
                            </p>
                          </td>
                          <td className="table-col-payment text-[var(--text-secondary)]">
                            <p className="font-medium text-[var(--text-primary)]">
                              {PAYMENT_TYPE_LABELS[purchase.paymentType]}
                            </p>
                            <p className="mt-1 text-sm">
                              {purchase.paymentType === "installment"
                                ? `${purchase.installmentMonths}개월 · ${formatCurrency(
                                    purchase.monthlyPayment,
                                  )}`
                                : "-"}
                            </p>
                          </td>
                          <td className="table-col-link">
                            {purchase.link ? (
                              <Link
                                href={purchase.link}
                                target="_blank"
                                rel="noreferrer"
                                className="planner-link text-sm font-semibold"
                              >
                                열기
                              </Link>
                            ) : (
                              <span className="text-[var(--text-muted)]">-</span>
                            )}
                          </td>
                          <td className="table-col-actions">
                            <div className="table-actions">
                              <Button
                                className="table-action-button"
                                size="sm"
                                variant="secondary"
                                onClick={() => startEdit(purchase)}
                              >
                                수정
                              </Button>
                              <Button
                                className="table-action-button"
                                size="sm"
                                variant="danger"
                                onClick={() => requestDelete(purchase)}
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

              <div className="grid gap-3 xl:hidden">
                {filteredPurchases.map((purchase) => (
                  <details
                    key={purchase.id}
                    className="planner-mobile-card p-4"
                  >
                    <summary className="list-none cursor-pointer">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge tone={purchaseToneMap[purchase.status]}>
                              {PURCHASE_STATUS_LABELS[purchase.status]}
                            </StatusBadge>
                            <p className="truncate text-base font-semibold text-[var(--text-primary)]">
                              {purchase.name}
                            </p>
                          </div>
                          <p className="mt-2 text-sm text-[var(--text-secondary)]">
                            {purchase.room} · {purchase.category}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                            {formatCurrency(purchase.totalPrice)}
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">상세 보기</p>
                        </div>
                      </div>
                    </summary>

                    <div className="mt-4 border-t border-[var(--border)] pt-4">
                      <div className="space-y-3">
                        <DetailRow
                          label="단가"
                          value={formatCurrency(purchase.unitPrice)}
                        />
                        <DetailRow
                          label="수량"
                          value={`${purchase.quantity}개`}
                        />
                        <DetailRow
                          label="결제 방식"
                          value={PAYMENT_TYPE_LABELS[purchase.paymentType]}
                        />
                        <DetailRow
                          label="월 납부액"
                          value={
                            purchase.paymentType === "installment"
                              ? `${formatCurrency(purchase.monthlyPayment)} / ${purchase.installmentMonths}개월`
                              : "-"
                          }
                        />
                        <DetailRow
                          label="상품 링크"
                          value={
                            purchase.link ? (
                              <Link
                                href={purchase.link}
                                target="_blank"
                                rel="noreferrer"
                                className="planner-link text-sm font-semibold"
                              >
                                바로 열기
                              </Link>
                            ) : (
                              "-"
                            )
                          }
                        />
                      </div>

                      {purchase.note ? (
                        <p className="planner-panel-muted radius-compact mt-4 px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">
                          {purchase.note}
                        </p>
                      ) : null}

                      <div className="mt-4 flex gap-2">
                        <Button
                          className="table-action-button flex-1"
                          size="sm"
                          variant="secondary"
                          onClick={() => startEdit(purchase)}
                        >
                          수정
                        </Button>
                        <Button
                          className="table-action-button flex-1"
                          size="sm"
                          variant="danger"
                          onClick={() => requestDelete(purchase)}
                        >
                          삭제
                        </Button>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </>
          )}
        </div>
      </SurfaceCard>

      <FormDialog
        open={isDialogOpen}
        title={editingPurchase ? "구매 항목 수정" : "구매 항목 추가"}
        description="총액과 월 할부 금액은 입력값에 맞춰 자동 계산됩니다."
        onClose={() => setIsDialogOpen(false)}
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="상태">
              <SelectInput
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as PurchaseStatus,
                  }))
                }
              >
                <option value="planned">구매 예정</option>
                <option value="completed">구매 완료</option>
              </SelectInput>
            </Field>

            <Field label="품목 이름">
              <TextInput
                required
                placeholder="예: 식탁"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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

            <Field label="분류">
              <SelectInput
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    category: event.target.value as PurchaseCategory,
                  }))
                }
              >
                {PURCHASE_CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="단가">
              <TextInput
                required
                inputMode="numeric"
                min="0"
                step="1000"
                type="number"
                value={form.unitPrice}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    unitPrice: Number(event.target.value),
                  }))
                }
              />
            </Field>

            <Field label="수량">
              <TextInput
                required
                inputMode="numeric"
                min="1"
                step="1"
                type="number"
                value={form.quantity}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    quantity: Number(event.target.value),
                  }))
                }
              />
            </Field>

            <Field label="결제 방식">
              <SelectInput
                value={form.paymentType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    paymentType: event.target.value as PurchaseFormValues["paymentType"],
                  }))
                }
              >
                <option value="lump">일시불</option>
                <option value="installment">할부</option>
              </SelectInput>
            </Field>
          </div>

          {form.paymentType === "installment" ? (
            <Field label="할부 개월 수">
              <TextInput
                required
                inputMode="numeric"
                min="1"
                step="1"
                type="number"
                value={form.installmentMonths}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    installmentMonths: Number(event.target.value),
                  }))
                }
              />
            </Field>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="planner-panel-muted p-4">
              <p className="text-sm text-[var(--text-secondary)]">자동 계산 총액</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                {formatCurrency(draftAmounts.totalPrice)}
              </p>
            </div>
            <div className="planner-panel-blue p-4">
              <p className="text-sm text-[var(--text-secondary)]">자동 계산 월 납부액</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                {form.paymentType === "installment"
                  ? formatCurrency(draftAmounts.monthlyPayment)
                  : "-"}
              </p>
            </div>
          </div>

          <Field label="상품 링크" hint="프로토콜 없이 입력하면 https://가 자동으로 붙어요.">
            <TextInput
              placeholder="예: store.example.com/item"
              value={form.link}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  link: event.target.value,
                }))
              }
            />
          </Field>

          <Field label="메모">
            <TextArea
              placeholder="색상, 치수, 체크할 조건 등을 적어두세요."
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
              {editingPurchase ? "수정 저장" : "구매 항목 추가"}
            </Button>
          </div>
        </form>
      </FormDialog>
    </div>
  );
}
