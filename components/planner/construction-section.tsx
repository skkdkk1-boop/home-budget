"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import type {
  Construction,
  ConstructionFormValues,
  Room,
} from "@/lib/planner-types";
import {
  CONSTRUCTION_STATUS_TONES,
  CONSTRUCTION_STATUS_LABELS,
  CONSTRUCTION_STATUS_OPTIONS,
  ROOM_OPTIONS,
} from "@/lib/planner-types";
import {
  formatCurrency,
  formatDate,
  keepVisibleSelections,
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

function createEmptyConstructionForm(): ConstructionFormValues {
  return {
    name: "",
    room: ROOM_OPTIONS[0],
    constructionStatus: CONSTRUCTION_STATUS_OPTIONS[0],
    constructionDate: todayKey(),
    cost: 0,
    company: "",
    contact: "",
    note: "",
  };
}

export function ConstructionSection() {
  const {
    data,
    isReady,
    addConstruction,
    updateConstruction,
    deleteConstruction,
    deleteConstructions,
  } = usePlannerData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConstruction, setEditingConstruction] =
    useState<Construction | null>(null);
  const [form, setForm] =
    useState<ConstructionFormValues>(createEmptyConstructionForm);
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
        cost: editingConstruction.cost,
        company: editingConstruction.company,
        contact: editingConstruction.contact,
        note: editingConstruction.note,
      });
      return;
    }

    setForm(createEmptyConstructionForm());
  }, [editingConstruction, isDialogOpen]);

  const sortedConstructions = useMemo(
    () => sortConstructionsByDate(data.constructions),
    [data.constructions],
  );
  const visibleConstructionIds = sortedConstructions.map((item) => item.id);
  const selectedVisibleCount = visibleConstructionIds.filter((id) =>
    selectedConstructionIds.includes(id),
  ).length;
  const isAllVisibleSelected =
    visibleConstructionIds.length > 0 &&
    visibleConstructionIds.every((id) => selectedConstructionIds.includes(id));
  const isSomeVisibleSelected =
    selectedVisibleCount > 0 && !isAllVisibleSelected;
  const today = todayKey();
  const activeCount = data.constructions.filter(
    (item) => item.constructionStatus !== "done" && item.constructionDate >= today,
  ).length;
  const completedCount = data.constructions.filter(
    (item) => item.constructionStatus === "done",
  ).length;
  const activeCost = data.constructions.reduce((sum, item) => {
    return item.constructionStatus !== "done" ? sum + item.cost : sum;
  }, 0);

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

    if (editingConstruction) {
      updateConstruction(editingConstruction.id, form);
    } else {
      addConstruction(form);
    }

    setIsDialogOpen(false);
  };

  const requestDelete = (construction: Construction) => {
    if (window.confirm(`"${construction.name}" 시공 항목을 삭제할까요?`)) {
      deleteConstruction(construction.id);
    }
  };

  useEffect(() => {
    setSelectedConstructionIds((current) =>
      keepVisibleSelections(
        current,
        sortedConstructions.map((item) => item.id),
      ),
    );
  }, [sortedConstructions]);

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
      deleteConstructions(selectedConstructionIds);
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
          value={`${data.constructions.length}건`}
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
                              onChange={toggleSelectAllConstructions}
                            />
                          </div>
                        </th>
                        <th className="table-col-status">상태</th>
                        <th className="table-col-left">시공명</th>
                        <th className="table-col-left">공간</th>
                        <th className="table-col-date">시공일</th>
                        <th className="table-col-amount">비용</th>
                        <th className="table-col-left">업체 / 연락처</th>
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
                            {formatDate(construction.constructionDate)}
                          </td>
                          <td className="table-col-amount numeric-value font-semibold text-[var(--text-primary)]">
                            {formatCurrency(construction.cost)}
                          </td>
                          <td className="table-col-left text-[var(--text-secondary)]">
                            <div className="table-cell-stack max-w-[16rem] gap-1">
                              <p className="table-cell-title text-sm">
                                {construction.company || "-"}
                              </p>
                              <p className="table-cell-meta">
                                {construction.contact || "-"}
                              </p>
                            </div>
                          </td>
                          <td className="table-col-actions">
                            <div className="table-action-slot">
                              <RowActionMenu
                                description={
                                  construction.company
                                    ? `${construction.room} · ${construction.company}`
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
                            {construction.company ? ` · ${construction.company}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            {formatDate(construction.constructionDate)}
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">시공일</p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        <DetailRow
                          label="비용"
                          value={
                            <span className="numeric-value">
                              {formatCurrency(construction.cost)}
                            </span>
                          }
                        />
                        <DetailRow
                          label="연락처"
                          value={construction.contact || "-"}
                        />
                        <DetailRow label="메모" value={construction.note || "-"} />
                      </div>
                    </div>

                    <RowActionMenu
                      description={
                        construction.company
                          ? `${construction.room} · ${construction.company}`
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

            <Field label="시공일">
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
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="비용">
              <TextInput
                inputMode="numeric"
                min="0"
                step="1000"
                type="number"
                value={form.cost}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    cost: Number(event.target.value),
                  }))
                }
              />
            </Field>

            <Field label="업체명">
              <TextInput
                placeholder="예: 화이트홈 인테리어"
                value={form.company}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    company: event.target.value,
                  }))
                }
              />
            </Field>

            <Field label="연락처">
              <TextInput
                placeholder="예: 010-1234-5678"
                value={form.contact}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    contact: event.target.value,
                  }))
                }
              />
            </Field>
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

          <ValuePreviewPanel label="예상 비용" value={formatCurrency(form.cost)} />

          <DialogActions
            onCancel={() => setIsDialogOpen(false)}
            submitLabel={editingConstruction ? "수정 저장" : "시공 항목 추가"}
          />
        </form>
      </FormDialog>
    </div>
  );
}
