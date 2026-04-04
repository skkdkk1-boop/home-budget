"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import type {
  Construction,
  ConstructionFormValues,
  Purchase,
  PurchaseFormValues,
  Room,
} from "@/lib/planner-types";
import {
  CONSTRUCTION_STATUS_TONES,
  CONSTRUCTION_STATUS_LABELS,
  CONSTRUCTION_STATUS_OPTIONS,
  ROOM_OPTIONS,
} from "@/lib/planner-types";
import {
  deriveConstructionsFromPurchases,
  formatCurrency,
  formatDate,
  keepVisibleSelections,
  mapConstructionStatusToPurchaseStatus,
  parseMoneyInput,
  sortConstructionsByDate,
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
  MoneyInput,
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
  ValuePreviewPanel,
} from "./ui";

type ConstructionFormState = Omit<
  ConstructionFormValues,
  "constructionTotalCost" | "constructionDeposit" | "constructionBalance"
> & {
  constructionTotalCost: string;
  constructionDeposit: string;
  constructionBalance: string;
};

function createEmptyConstructionForm(): ConstructionFormState {
  return {
    name: "",
    room: ROOM_OPTIONS[0],
    constructionStatus: CONSTRUCTION_STATUS_OPTIONS[0],
    constructionDate: todayKey(),
    constructionStartTime: "",
    constructionCompany: "",
    constructionTotalCost: "",
    constructionDeposit: "",
    constructionBalance: "",
    note: "",
  };
}

export function ConstructionSection() {
  const {
    data,
    isReady,
    addPurchase,
    updatePurchase,
  } = usePlannerData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConstruction, setEditingConstruction] =
    useState<Construction | null>(null);
  const [form, setForm] =
    useState<ConstructionFormState>(createEmptyConstructionForm);
  const [selectedConstructionIds, setSelectedConstructionIds] = useState<
    string[]
  >([]);

  useEffect(() => {
    if (!isDialogOpen) {
      setEditingConstruction(null);
      setForm(createEmptyConstructionForm());
      return;
    }

    if (editingConstruction) {
      setForm({
        name: editingConstruction.name,
        room: editingConstruction.room,
        constructionStatus: editingConstruction.constructionStatus,
        constructionDate: editingConstruction.constructionDate,
        constructionStartTime: editingConstruction.constructionStartTime,
        constructionCompany: editingConstruction.constructionCompany,
        constructionTotalCost: editingConstruction.constructionTotalCost
          ? String(editingConstruction.constructionTotalCost)
          : "",
        constructionDeposit: editingConstruction.constructionDeposit
          ? String(editingConstruction.constructionDeposit)
          : "",
        constructionBalance: editingConstruction.constructionBalance
          ? String(editingConstruction.constructionBalance)
          : "",
        note: editingConstruction.note,
      });
      return;
    }

    setForm(createEmptyConstructionForm());
  }, [editingConstruction, isDialogOpen]);

  const sortedConstructions = useMemo(
    () => sortConstructionsByDate(deriveConstructionsFromPurchases(data.purchases)),
    [data.purchases],
  );
  const visibleConstructionIds = useMemo(
    () => sortedConstructions.map((item) => item.id),
    [sortedConstructions],
  );
  const selectedVisibleCount = visibleConstructionIds.filter((id) =>
    selectedConstructionIds.includes(id),
  ).length;
  const isAllVisibleSelected =
    visibleConstructionIds.length > 0 &&
    visibleConstructionIds.every((id) => selectedConstructionIds.includes(id));
  const isSomeVisibleSelected =
    selectedVisibleCount > 0 && !isAllVisibleSelected;
  const today = todayKey();
  const activeCount = sortedConstructions.filter(
    (item) => item.constructionStatus !== "done" && item.constructionDate >= today,
  ).length;
  const completedCount = sortedConstructions.filter(
    (item) => item.constructionStatus === "done",
  ).length;
  const activeCost = sortedConstructions.reduce((sum, item) => {
    return item.constructionStatus !== "done"
      ? sum + item.constructionTotalCost
      : sum;
  }, 0);
  const detailRoomOptions = useMemo(() => {
    if (ROOM_OPTIONS.includes(form.room as Room)) {
      return ROOM_OPTIONS;
    }

    return [...ROOM_OPTIONS, form.room] as const;
  }, [form.room]);
  const buildPurchaseInput = (
    basePurchase: Purchase | null,
    overrides: Partial<ConstructionFormValues & { constructionRequired: boolean }>,
  ): PurchaseFormValues => {
    const constructionRequired =
      overrides.constructionRequired ?? basePurchase?.constructionRequired ?? true;
    const constructionTotalCost =
      overrides.constructionTotalCost ?? basePurchase?.constructionTotalCost ?? 0;

    return {
    status:
      overrides.constructionStatus !== undefined
        ? mapConstructionStatusToPurchaseStatus(overrides.constructionStatus)
        : basePurchase?.status ?? "planned",
    room: overrides.room ?? basePurchase?.room ?? ROOM_OPTIONS[0],
    category: constructionRequired ? "시공" : basePurchase?.category ?? "기타",
    name: overrides.name ?? basePurchase?.name ?? "",
    unitPrice: constructionRequired ? constructionTotalCost : basePurchase?.unitPrice ?? 0,
    quantity: basePurchase?.quantity ?? 1,
    paymentType: basePurchase?.paymentType ?? "lump",
    installmentMonths:
      basePurchase?.paymentType === "installment"
        ? basePurchase.installmentMonths
        : 12,
    link: basePurchase?.link ?? "",
    note: overrides.note ?? basePurchase?.note ?? "",
    deliveryRequired: basePurchase?.deliveryRequired ?? false,
    deliveryDate: basePurchase?.deliveryDate ?? "",
    constructionRequired,
    constructionStatus:
      overrides.constructionStatus ?? basePurchase?.constructionStatus ?? "before",
    constructionDate: overrides.constructionDate ?? basePurchase?.constructionDate ?? "",
    constructionStartTime:
      overrides.constructionStartTime ?? basePurchase?.constructionStartTime ?? "",
    constructionCompany:
      overrides.constructionCompany ?? basePurchase?.constructionCompany ?? "",
    constructionTotalCost,
    constructionDeposit:
      overrides.constructionDeposit ?? basePurchase?.constructionDeposit ?? 0,
    constructionBalance:
      overrides.constructionBalance ?? basePurchase?.constructionBalance ?? 0,
  };
  };
  const draftConstructionTotalCost = parseMoneyInput(form.constructionTotalCost);
  const draftConstructionDeposit = parseMoneyInput(form.constructionDeposit);
  const draftConstructionBalance = parseMoneyInput(form.constructionBalance);

  const startCreate = () => {
    setEditingConstruction(null);
    setIsDialogOpen(true);
  };

  const startEdit = (construction: Construction) => {
    setEditingConstruction(construction);
    setIsDialogOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const existingPurchase = editingConstruction
      ? data.purchases.find((item) => item.id === editingConstruction.id)
      : null;
    const nextInput = buildPurchaseInput(existingPurchase ?? null, {
      name: form.name,
      room: form.room,
      note: form.note,
      constructionRequired: true,
      constructionStatus: form.constructionStatus,
      constructionDate: form.constructionDate,
      constructionStartTime: form.constructionStartTime,
      constructionCompany: form.constructionCompany,
      constructionTotalCost: parseMoneyInput(form.constructionTotalCost),
      constructionDeposit: parseMoneyInput(form.constructionDeposit),
      constructionBalance: parseMoneyInput(form.constructionBalance),
    });

    if (editingConstruction) {
      updatePurchase(editingConstruction.id, nextInput);
    } else {
      addPurchase(nextInput);
    }

    setIsDialogOpen(false);
  };

  const requestDelete = (construction: Construction) => {
    if (window.confirm(`"${construction.name}" 시공 항목을 삭제할까요?`)) {
      const existingPurchase =
        data.purchases.find((item) => item.id === construction.id) ?? null;

      if (!existingPurchase) {
        return;
      }

      updatePurchase(
        construction.id,
        buildPurchaseInput(existingPurchase, {
          constructionRequired: false,
          constructionStatus: undefined,
          constructionDate: "",
          constructionStartTime: "",
          constructionCompany: "",
          constructionTotalCost: 0,
          constructionDeposit: 0,
          constructionBalance: 0,
        }),
      );
    }
  };

  useEffect(() => {
    setSelectedConstructionIds((current) => {
      const next = keepVisibleSelections(current, visibleConstructionIds);

      if (
        current.length === next.length &&
        current.every((id, index) => id === next[index])
      ) {
        return current;
      }

      return next;
    });
  }, [visibleConstructionIds]);

  const toggleConstructionSelection = (constructionId: string) => {
    setSelectedConstructionIds((current) =>
      toggleSelectionItem(current, constructionId),
    );
  };

  const toggleSelectAllConstructions = () => {
    setSelectedConstructionIds((current) =>
      toggleAllVisibleSelections(
        current,
        visibleConstructionIds,
        isAllVisibleSelected,
      ),
    );
  };

  const clearConstructionSelection = () => {
    setSelectedConstructionIds([]);
  };

  const handleBulkDeleteConstructions = () => {
    if (selectedConstructionIds.length === 0) {
      return;
    }

    if (
      window.confirm(
        `선택한 ${selectedConstructionIds.length}개 항목을 삭제할까요?`,
      )
    ) {
      selectedConstructionIds.forEach((id) => {
        const existingPurchase = data.purchases.find((item) => item.id === id) ?? null;

        if (!existingPurchase) {
          return;
        }

        updatePurchase(
          id,
          buildPurchaseInput(existingPurchase, {
            constructionRequired: false,
            constructionStatus: undefined,
            constructionDate: "",
            constructionStartTime: "",
            constructionCompany: "",
            constructionTotalCost: 0,
            constructionDeposit: 0,
            constructionBalance: 0,
          }),
        );
      });
      clearConstructionSelection();
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
          label="전체 시공 항목"
          value={`${sortedConstructions.length}건`}
        />
        <SummaryCard
          label="예정 / 진행 중"
          value={`${activeCount}건`}
          tone="highlight"
        />
        <SummaryCard
          label="완료 시공"
          value={`${completedCount}건`}
        />
        <SummaryCard
          label="예정 시공 비용"
          value={formatCurrency(activeCost)}
        />
      </div>

      <SurfaceCard>
        <SectionHeader action={<Button onClick={startCreate}>시공 항목 추가</Button>} />

        {selectedConstructionIds.length > 0 ? (
          <div className="mt-4">
            <BulkActionBar
              count={selectedConstructionIds.length}
              onClear={clearConstructionSelection}
            >
              <Button
                size="sm"
                variant="danger"
                onClick={handleBulkDeleteConstructions}
              >
                선택 삭제
              </Button>
            </BulkActionBar>
          </div>
        ) : null}

        <div className="mt-4">
          {sortedConstructions.length === 0 ? (
            <EmptyState
              title="등록된 시공이 없어요"
              description="도배, 조명, 선반 설치처럼 챙겨야 할 공정을 추가해보세요."
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
                              onChange={() => toggleSelectAllConstructions()}
                            />
                          </div>
                        </th>
                        <th className="table-col-status">상태</th>
                        <th className="table-col-left">시공명</th>
                        <th className="table-col-left">공간</th>
                        <th className="table-col-date">일정</th>
                        <th className="table-col-amount">비용</th>
                        <th className="table-col-left">업체</th>
                        <th className="table-col-actions">
                          <span className="sr-only">행 동작</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedConstructions.map((construction) => (
                        <tr key={construction.id}>
                          <td className="table-col-select">
                            <div className="table-action-slot">
                              <SelectionCheckbox
                                aria-label={`${construction.name} 선택`}
                                checked={selectedConstructionIds.includes(construction.id)}
                                onChange={() =>
                                  toggleConstructionSelection(construction.id)
                                }
                              />
                            </div>
                          </td>
                          <td className="table-col-status">
                            <StatusBadge
                              tone={
                                CONSTRUCTION_STATUS_TONES[
                                  construction.constructionStatus
                                ]
                              }
                            >
                              {
                                CONSTRUCTION_STATUS_LABELS[
                                  construction.constructionStatus
                                ]
                              }
                            </StatusBadge>
                          </td>
                          <td className="table-col-left">
                            <div className="table-cell-stack max-w-[18.5rem]">
                              <p className="table-cell-title">{construction.name}</p>
                              {construction.note ? (
                                <p className="table-cell-note">{construction.note}</p>
                              ) : null}
                            </div>
                          </td>
                          <td className="table-col-left text-[var(--text-secondary)]">
                            {construction.room}
                          </td>
                          <td className="table-col-date text-[var(--text-primary)]">
                            <div className="table-cell-stack items-center">
                              <p>{formatDate(construction.constructionDate)}</p>
                              <p className="table-cell-meta">
                                {construction.constructionStartTime || "-"}
                              </p>
                            </div>
                          </td>
                          <td className="table-col-amount numeric-value font-semibold text-[var(--text-primary)]">
                            {formatCurrency(construction.constructionTotalCost)}
                          </td>
                          <td className="table-col-left text-[var(--text-secondary)]">
                            <div className="table-cell-stack max-w-[16rem] gap-1">
                              <p className="table-cell-title text-sm">
                                {construction.constructionCompany || "-"}
                              </p>
                            </div>
                          </td>
                          <td className="table-col-actions">
                            <div className="table-action-slot">
                              <RowActionMenu
                                description={
                                  construction.constructionCompany
                                    ? `${construction.room} · ${construction.constructionCompany}`
                                    : construction.room
                                }
                                label={construction.name}
                                mode="desktop"
                                onDelete={() => requestDelete(construction)}
                                onEdit={() => startEdit(construction)}
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
                {sortedConstructions.map((construction) => (
                  <article
                    key={construction.id}
                    className="planner-mobile-card relative p-4 sm:p-5"
                  >
                    <div className="absolute left-4 top-4 z-10">
                      <SelectionCheckbox
                        aria-label={`${construction.name} 선택`}
                        checked={selectedConstructionIds.includes(construction.id)}
                        onChange={() => toggleConstructionSelection(construction.id)}
                      />
                    </div>

                    <div className="pl-8 pr-12">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge
                              tone={
                                CONSTRUCTION_STATUS_TONES[
                                  construction.constructionStatus
                                ]
                              }
                            >
                              {
                                CONSTRUCTION_STATUS_LABELS[
                                  construction.constructionStatus
                                ]
                              }
                            </StatusBadge>
                            <p className="table-cell-title text-base">
                              {construction.name}
                            </p>
                          </div>
                          <p className="mt-2 text-sm text-[var(--text-secondary)]">
                            {construction.room}
                            {construction.constructionCompany
                              ? ` · ${construction.constructionCompany}`
                              : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            {formatDate(construction.constructionDate)}
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            {construction.constructionStartTime || "시작시간 미정"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        <DetailRow
                          label="총금액"
                          value={
                            <span className="numeric-value">
                              {formatCurrency(construction.constructionTotalCost)}
                            </span>
                          }
                        />
                        <DetailRow
                          label="계약금"
                          value={formatCurrency(construction.constructionDeposit)}
                        />
                        <DetailRow
                          label="잔금"
                          value={formatCurrency(construction.constructionBalance)}
                        />
                        <DetailRow label="메모" value={construction.note || "-"} />
                      </div>
                    </div>

                    <RowActionMenu
                      description={
                        construction.constructionCompany
                          ? `${construction.room} · ${construction.constructionCompany}`
                          : construction.room
                      }
                      label={construction.name}
                      mode="mobile"
                      onDelete={() => requestDelete(construction)}
                      onEdit={() => startEdit(construction)}
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
        title={editingConstruction ? "시공 항목 수정" : "시공 항목 추가"}
        description="시공일과 비용, 업체 정보를 함께 기록해두면 관리가 쉬워져요."
        onClose={() => setIsDialogOpen(false)}
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Field label="시공명">
            <TextInput
              required
              placeholder="예: 도배"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
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
                    room: event.target.value as ConstructionFormValues["room"],
                  }))
                }
              >
                {detailRoomOptions.map((room) => (
                  <option key={room} value={room}>
                    {room}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label="시공 상태">
              <SelectInput
                value={form.constructionStatus}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    constructionStatus:
                      event.target.value as ConstructionFormValues["constructionStatus"],
                  }))
                }
              >
                {CONSTRUCTION_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {CONSTRUCTION_STATUS_LABELS[status]}
                  </option>
                  ))}
                </SelectInput>
              </Field>
          </div>

          <div className="planner-panel-muted p-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              시공 정보
            </p>

            <div className="mt-4 grid gap-5">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  📅 일정
                </p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <Field label="날짜">
                    <TextInput
                      required
                      type="date"
                      value={form.constructionDate}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          constructionDate: event.target.value,
                        }))
                      }
                    />
                  </Field>

                  <Field label="시작시간">
                    <TextInput
                      type="time"
                      value={form.constructionStartTime}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          constructionStartTime: event.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  🏢 업체
                </p>
                <div className="mt-3 max-w-[18rem]">
                  <Field label="업체명">
                    <TextInput
                      placeholder="예: 화이트홈"
                      value={form.constructionCompany}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          constructionCompany: event.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  💰 비용
                </p>
                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  <Field label="총금액">
                    <MoneyInput
                      value={form.constructionTotalCost}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          constructionTotalCost: value,
                        }))
                      }
                    />
                  </Field>

                  <Field label="계약금">
                    <MoneyInput
                      value={form.constructionDeposit}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          constructionDeposit: value,
                        }))
                      }
                    />
                  </Field>

                  <Field label="잔금">
                    <MoneyInput
                      value={form.constructionBalance}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          constructionBalance: value,
                        }))
                      }
                    />
                  </Field>
                </div>
              </div>
            </div>
          </div>

          <Field label="메모">
            <TextArea
              placeholder="사전 준비물, 색상, 실측 메모 등을 적어두세요."
              value={form.note}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  note: event.target.value,
                }))
              }
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-3">
            <ValuePreviewPanel
              label="총금액"
              value={formatCurrency(draftConstructionTotalCost)}
            />
            <ValuePreviewPanel
              label="계약금"
              value={formatCurrency(draftConstructionDeposit)}
            />
            <ValuePreviewPanel
              label="잔금"
              value={formatCurrency(draftConstructionBalance)}
            />
          </div>

          <DialogActions
            onCancel={() => setIsDialogOpen(false)}
            submitLabel={editingConstruction ? "수정 저장" : "시공 항목 추가"}
          />
        </form>
      </FormDialog>
    </div>
  );
}
