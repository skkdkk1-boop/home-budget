"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import type {
  DisposalItem,
  DisposalItemFormValues,
  DisposalItemSortOption,
  DisposalStatus,
  SellLocation,
} from "@/lib/planner-types";
import {
  DISPOSAL_STATUS_LABELS,
  DISPOSAL_STATUS_OPTIONS,
  DISPOSAL_STATUS_TONES,
  SELL_LOCATION_OPTIONS,
} from "@/lib/planner-types";
import {
  compareDateAsc,
  compareRecent,
  formatCurrency,
  formatDate,
  keepVisibleSelections,
  parseMoneyInput,
  toggleAllVisibleSelections,
  toggleSelectionItem,
} from "@/lib/planner-utils";

import { usePlannerData } from "./planner-provider";
import { usePlannerQueryState } from "./use-planner-query-state";
import {
  BulkActionBar,
  Button,
  DetailRow,
  DialogActions,
  EmptyState,
  Field,
  FormDialog,
  MoneyInput,
  RowActionMenu,
  SectionHeader,
  SelectionCheckbox,
  SelectInput,
  StatusBadge,
  TableContainer,
  TextArea,
  TextInput,
} from "./ui";

type DisposalFormState = Omit<DisposalItemFormValues, "disposalCost"> & {
  disposalCost: string;
};

function createEmptyDisposalForm(): DisposalFormState {
  return {
    name: "",
    currentLocation: SELL_LOCATION_OPTIONS[0],
    disposalMethod: "",
    reservationRequired: false,
    disposalCost: "",
    disposalDate: "",
    status: "planned",
    note: "",
  };
}

export function MovingDisposalSection() {
  const {
    data,
    isReadOnly,
    addDisposalItem,
    updateDisposalItem,
    deleteDisposalItem,
    deleteDisposalItems,
  } = usePlannerData();
  const { getValue, setValues } = usePlannerQueryState();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DisposalItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const locationFilter = getValue<SellLocation | "all">("disposeLocation", "all", [
    ...SELL_LOCATION_OPTIONS,
    "all",
  ]);
  const statusFilter = getValue<DisposalStatus | "all">("disposeStatus", "all", [
    ...DISPOSAL_STATUS_OPTIONS,
    "all",
  ]);
  const sortBy = getValue<DisposalItemSortOption>("disposeSort", "recent", [
    "recent",
    "deadline",
    "costHigh",
    "costLow",
  ]);
  const [form, setForm] = useState<DisposalFormState>(createEmptyDisposalForm);

  const filteredItems = useMemo(() => {
    const nextItems = data.disposalItems.filter((item) => {
      const matchesLocation =
        locationFilter === "all" ? true : item.currentLocation === locationFilter;
      const matchesStatus = statusFilter === "all" ? true : item.status === statusFilter;

      return matchesLocation && matchesStatus;
    });

    nextItems.sort((left, right) => {
      if (sortBy === "deadline") {
        return compareDateAsc(left.disposalDate, right.disposalDate) || compareRecent(left, right);
      }

      if (sortBy === "costHigh") {
        return right.disposalCost - left.disposalCost || compareRecent(left, right);
      }

      if (sortBy === "costLow") {
        return left.disposalCost - right.disposalCost || compareRecent(left, right);
      }

      return compareRecent(left, right);
    });

    return nextItems;
  }, [data.disposalItems, locationFilter, sortBy, statusFilter]);

  const visibleIds = useMemo(
    () => filteredItems.map((item) => item.id),
    [filteredItems],
  );
  const selectedVisibleCount = visibleIds.filter((id) => selectedIds.includes(id)).length;
  const isAllVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const isSomeVisibleSelected = selectedVisibleCount > 0 && !isAllVisibleSelected;
  const methodSuggestions = useMemo(() => {
    return Array.from(new Set(data.disposalItems.map((item) => item.disposalMethod.trim())))
      .filter(Boolean)
      .slice(0, 12);
  }, [data.disposalItems]);

  useEffect(() => {
    setSelectedIds((current) => {
      const next = keepVisibleSelections(current, visibleIds);

      if (
        current.length === next.length &&
        current.every((id, index) => id === next[index])
      ) {
        return current;
      }

      return next;
    });
  }, [visibleIds]);

  const startCreate = () => {
    setEditingItem(null);
    setForm(createEmptyDisposalForm());
    setIsDialogOpen(true);
  };

  const startEdit = (item: DisposalItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      currentLocation: item.currentLocation,
      disposalMethod: item.disposalMethod,
      reservationRequired: item.reservationRequired,
      disposalCost: String(item.disposalCost),
      disposalDate: item.disposalDate,
      status: item.status,
      note: item.note,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextInput: DisposalItemFormValues = {
      ...form,
      disposalCost: parseMoneyInput(form.disposalCost),
    };

    if (editingItem) {
      updateDisposalItem(editingItem.id, nextInput);
    } else {
      addDisposalItem(nextInput);
    }

    setIsDialogOpen(false);
  };

  const requestDelete = (item: DisposalItem) => {
    if (window.confirm(`"${item.name}" 폐기 항목을 삭제할까요?`)) {
      deleteDisposalItem(item.id);
    }
  };

  const toggleItemSelection = (id: string) => {
    setSelectedIds((current) => toggleSelectionItem(current, id));
  };

  const toggleSelectAll = () => {
    setSelectedIds((current) =>
      toggleAllVisibleSelections(current, visibleIds, isAllVisibleSelected),
    );
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) {
      return;
    }

    if (window.confirm(`선택한 ${selectedIds.length}개 항목을 삭제할까요?`)) {
      deleteDisposalItems(selectedIds);
      clearSelection();
    }
  };

  return (
    <>
      <SectionHeader
        action={!isReadOnly ? <Button onClick={startCreate}>폐기 항목 추가</Button> : undefined}
      />

      {!isReadOnly && selectedIds.length > 0 ? (
        <div className="mt-4">
          <BulkActionBar count={selectedIds.length} onClear={clearSelection}>
            <Button size="sm" variant="danger" onClick={handleBulkDelete}>
              선택 삭제
            </Button>
          </BulkActionBar>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))] lg:items-end">
        <Field label="현재 위치">
          <SelectInput
            value={locationFilter}
            onChange={(event) =>
              setValues(
                { disposeLocation: event.target.value as SellLocation | "all" },
                { disposeLocation: "all" },
              )
            }
          >
            <option value="all">전체 위치</option>
            {SELL_LOCATION_OPTIONS.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="상태">
          <SelectInput
            value={statusFilter}
            onChange={(event) =>
              setValues(
                { disposeStatus: event.target.value as DisposalStatus | "all" },
                { disposeStatus: "all" },
              )
            }
          >
            <option value="all">전체 상태</option>
            {DISPOSAL_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {DISPOSAL_STATUS_LABELS[status]}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="정렬">
          <SelectInput
            value={sortBy}
            onChange={(event) =>
              setValues(
                { disposeSort: event.target.value as DisposalItemSortOption },
                { disposeSort: "recent" },
              )
            }
          >
            <option value="recent">최근 등록순</option>
            <option value="deadline">예정일순</option>
            <option value="costHigh">높은 비용순</option>
            <option value="costLow">낮은 비용순</option>
          </SelectInput>
        </Field>
      </div>

      <div className="mt-4">
        {filteredItems.length === 0 ? (
          <EmptyState
            title="조건에 맞는 폐기 항목이 없어요"
            description={
              isReadOnly
                ? "필터를 조정해보세요."
                : "폐기할 품목을 추가하거나 필터를 조정해보세요."
            }
          />
        ) : (
          <>
            <div className="hidden xl:block">
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
                            onChange={() => toggleSelectAll()}
                          />
                        </div>
                        </th>
                      ) : null}
                      <th className="table-col-status">상태</th>
                      <th className="table-col-left">품목명</th>
                      <th className="table-col-left">현재 위치</th>
                      <th className="table-col-left">폐기 방법</th>
                      <th className="table-col-center">예약</th>
                      <th className="table-col-amount">비용</th>
                      <th className="table-col-date">폐기 예정일</th>
                      <th className="table-col-left">메모</th>
                      {!isReadOnly ? (
                        <th className="table-col-actions">
                          <span className="sr-only">행 동작</span>
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item.id}>
                        {!isReadOnly ? (
                          <td className="table-col-select">
                          <div className="table-action-slot">
                            <SelectionCheckbox
                              aria-label={`${item.name} 선택`}
                              checked={selectedIds.includes(item.id)}
                              onChange={() => toggleItemSelection(item.id)}
                            />
                          </div>
                          </td>
                        ) : null}
                        <td className="table-col-status">
                          <StatusBadge tone={DISPOSAL_STATUS_TONES[item.status]}>
                            {DISPOSAL_STATUS_LABELS[item.status]}
                          </StatusBadge>
                        </td>
                        <td className="table-col-left">
                          <p className="table-cell-title">{item.name}</p>
                        </td>
                        <td className="table-col-left text-[var(--text-secondary)]">
                          {item.currentLocation}
                        </td>
                        <td className="table-col-left text-[var(--text-secondary)]">
                          {item.disposalMethod || "-"}
                        </td>
                        <td className="table-col-center text-[var(--text-secondary)]">
                          {item.reservationRequired ? "필요" : "불필요"}
                        </td>
                        <td className="table-col-amount numeric-value text-[var(--text-primary)]">
                          {formatCurrency(item.disposalCost)}
                        </td>
                        <td className="table-col-date text-[var(--text-primary)]">
                          {formatDate(item.disposalDate)}
                        </td>
                        <td className="table-col-left text-[var(--text-secondary)]">
                          {item.note ? (
                            <p className="table-cell-note max-w-[18rem]">{item.note}</p>
                          ) : (
                            "-"
                          )}
                        </td>
                        {!isReadOnly ? (
                          <td className="table-col-actions">
                          <div className="table-action-slot">
                            <RowActionMenu
                              description={`${item.currentLocation} · ${DISPOSAL_STATUS_LABELS[item.status]}`}
                              label={item.name}
                              mode="desktop"
                              onDelete={() => requestDelete(item)}
                              onEdit={() => startEdit(item)}
                            />
                          </div>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableContainer>
            </div>

            <div className="grid gap-3 xl:hidden">
              {filteredItems.map((item) => (
                <article
                  key={item.id}
                  className="planner-mobile-card relative p-4 sm:p-5"
                >
                  {!isReadOnly ? (
                    <div className="absolute left-4 top-4 z-10">
                      <SelectionCheckbox
                        aria-label={`${item.name} 선택`}
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleItemSelection(item.id)}
                      />
                    </div>
                  ) : null}

                  <div className={isReadOnly ? "pr-4" : "pl-8 pr-12"}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge tone={DISPOSAL_STATUS_TONES[item.status]}>
                            {DISPOSAL_STATUS_LABELS[item.status]}
                          </StatusBadge>
                          <p className="table-cell-title text-base">{item.name}</p>
                        </div>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                          {item.currentLocation}
                          {item.disposalMethod ? ` · ${item.disposalMethod}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="numeric-value text-sm font-semibold text-[var(--text-primary)]">
                          {formatCurrency(item.disposalCost)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">폐기 비용</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <DetailRow
                        label="예약 필요 여부"
                        value={item.reservationRequired ? "필요" : "불필요"}
                      />
                      <DetailRow label="폐기 예정일" value={formatDate(item.disposalDate)} />
                      <DetailRow label="메모" value={item.note || "-"} />
                    </div>
                  </div>

                  {!isReadOnly ? (
                    <RowActionMenu
                      description={`${item.currentLocation} · ${DISPOSAL_STATUS_LABELS[item.status]}`}
                      label={item.name}
                      mode="mobile"
                      onDelete={() => requestDelete(item)}
                      onEdit={() => startEdit(item)}
                      triggerClassName="absolute right-4 top-4"
                    />
                  ) : null}
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      {!isReadOnly ? (
        <FormDialog
          open={isDialogOpen}
          title={editingItem ? "폐기 항목 수정" : "폐기 항목 추가"}
          description="폐기 방법과 예정일을 함께 적어두면 예약과 비용을 놓치지 않기 쉬워져요."
          onClose={() => setIsDialogOpen(false)}
        >
          <form className="grid gap-4" onSubmit={handleSubmit}>
          <Field label="품목명">
            <TextInput
              required
              autoFocus
              placeholder="예: 접이식 침대"
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
            <Field label="현재 위치">
              <SelectInput
                value={form.currentLocation}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    currentLocation: event.target.value as SellLocation,
                  }))
                }
              >
                {SELL_LOCATION_OPTIONS.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <Field label="상태">
              <SelectInput
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as DisposalStatus,
                  }))
                }
              >
                {DISPOSAL_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {DISPOSAL_STATUS_LABELS[status]}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="폐기 방법">
              <TextInput
                list="disposal-method-suggestions"
                placeholder="예: 대형 폐기물 신고"
                value={form.disposalMethod}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    disposalMethod: event.target.value,
                  }))
                }
              />
              <datalist id="disposal-method-suggestions">
                {methodSuggestions.map((method) => (
                  <option key={method} value={method} />
                ))}
              </datalist>
            </Field>

            <Field label="예약 필요 여부">
              <SelectInput
                value={form.reservationRequired ? "true" : "false"}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    reservationRequired: event.target.value === "true",
                  }))
                }
              >
                <option value="true">예약 필요</option>
                <option value="false">예약 불필요</option>
              </SelectInput>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="폐기 비용">
              <MoneyInput
                required
                value={form.disposalCost}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    disposalCost: value,
                  }))
                }
              />
            </Field>

            <Field label="폐기 예정일">
              <TextInput
                required
                type="date"
                value={form.disposalDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    disposalDate: event.target.value,
                  }))
                }
              />
            </Field>
          </div>

          <Field label="메모">
            <TextArea
              placeholder="배출 위치, 예약 번호, 수거 기사 요청사항 등을 적어두세요."
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
            submitLabel={editingItem ? "수정 저장" : "폐기 항목 추가"}
          />
          </form>
        </FormDialog>
      ) : null}
    </>
  );
}
