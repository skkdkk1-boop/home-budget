"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import type {
  MoveItem,
  MoveItemFormValues,
  MoveItemSortOption,
  MoveItemStatus,
  SellLocation,
} from "@/lib/planner-types";
import {
  MOVE_ITEM_STATUS_LABELS,
  MOVE_ITEM_STATUS_OPTIONS,
  MOVE_ITEM_STATUS_TONES,
  SELL_LOCATION_OPTIONS,
} from "@/lib/planner-types";
import {
  compareRecent,
  keepVisibleSelections,
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
  RowActionMenu,
  SectionHeader,
  SelectionCheckbox,
  SelectInput,
  StatusBadge,
  TableContainer,
  TextArea,
  TextInput,
} from "./ui";

function createEmptyMoveForm(): MoveItemFormValues {
  return {
    name: "",
    currentLocation: SELL_LOCATION_OPTIONS[0],
    targetLocation: SELL_LOCATION_OPTIONS[1] ?? SELL_LOCATION_OPTIONS[0],
    status: "before",
    note: "",
  };
}

function compareLocation(left: string, right: string) {
  return left.localeCompare(right, "ko");
}

export function MovingTransferSection() {
  const { data, isReadOnly, addMoveItem, updateMoveItem, deleteMoveItem, deleteMoveItems } =
    usePlannerData();
  const { getValue, setValues } = usePlannerQueryState();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MoveItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const locationFilter = getValue<SellLocation | "all">("moveLocation", "all", [
    ...SELL_LOCATION_OPTIONS,
    "all",
  ]);
  const statusFilter = getValue<MoveItemStatus | "all">("moveStatus", "all", [
    ...MOVE_ITEM_STATUS_OPTIONS,
    "all",
  ]);
  const sortBy = getValue<MoveItemSortOption>("moveSort", "recent", [
    "recent",
    "currentLocation",
    "targetLocation",
  ]);
  const [form, setForm] = useState<MoveItemFormValues>(createEmptyMoveForm);

  const filteredItems = useMemo(() => {
    const nextItems = data.moveItems.filter((item) => {
      const matchesLocation =
        locationFilter === "all" ? true : item.currentLocation === locationFilter;
      const matchesStatus = statusFilter === "all" ? true : item.status === statusFilter;

      return matchesLocation && matchesStatus;
    });

    nextItems.sort((left, right) => {
      if (sortBy === "currentLocation") {
        return (
          compareLocation(left.currentLocation, right.currentLocation) || compareRecent(left, right)
        );
      }

      if (sortBy === "targetLocation") {
        return (
          compareLocation(left.targetLocation, right.targetLocation) || compareRecent(left, right)
        );
      }

      return compareRecent(left, right);
    });

    return nextItems;
  }, [data.moveItems, locationFilter, sortBy, statusFilter]);

  const visibleIds = useMemo(
    () => filteredItems.map((item) => item.id),
    [filteredItems],
  );
  const selectedVisibleCount = visibleIds.filter((id) => selectedIds.includes(id)).length;
  const isAllVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const isSomeVisibleSelected = selectedVisibleCount > 0 && !isAllVisibleSelected;

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
    setForm(createEmptyMoveForm());
    setIsDialogOpen(true);
  };

  const startEdit = (item: MoveItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      currentLocation: item.currentLocation,
      targetLocation: item.targetLocation,
      status: item.status,
      note: item.note,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (editingItem) {
      updateMoveItem(editingItem.id, form);
    } else {
      addMoveItem(form);
    }

    setIsDialogOpen(false);
  };

  const requestDelete = (item: MoveItem) => {
    if (window.confirm(`"${item.name}" 이동 항목을 삭제할까요?`)) {
      deleteMoveItem(item.id);
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
      deleteMoveItems(selectedIds);
      clearSelection();
    }
  };

  return (
    <>
      <SectionHeader
        action={!isReadOnly ? <Button onClick={startCreate}>이동 항목 추가</Button> : undefined}
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
                { moveLocation: event.target.value as SellLocation | "all" },
                { moveLocation: "all" },
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
                { moveStatus: event.target.value as MoveItemStatus | "all" },
                { moveStatus: "all" },
              )
            }
          >
            <option value="all">전체 상태</option>
            {MOVE_ITEM_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {MOVE_ITEM_STATUS_LABELS[status]}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="정렬">
          <SelectInput
            value={sortBy}
            onChange={(event) =>
              setValues(
                { moveSort: event.target.value as MoveItemSortOption },
                { moveSort: "recent" },
              )
            }
          >
            <option value="recent">최근 등록순</option>
            <option value="currentLocation">현재 위치순</option>
            <option value="targetLocation">이동 위치순</option>
          </SelectInput>
        </Field>
      </div>

      <div className="mt-4">
        {filteredItems.length === 0 ? (
          <EmptyState
            title="조건에 맞는 이동 항목이 없어요"
            description={
              isReadOnly
                ? "필터를 조정해보세요."
                : "정리하거나 이동할 품목을 추가하거나 필터를 조정해보세요."
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
                      <th className="table-col-left">이동할 위치</th>
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
                          <StatusBadge tone={MOVE_ITEM_STATUS_TONES[item.status]}>
                            {MOVE_ITEM_STATUS_LABELS[item.status]}
                          </StatusBadge>
                        </td>
                        <td className="table-col-left">
                          <p className="table-cell-title">{item.name}</p>
                        </td>
                        <td className="table-col-left text-[var(--text-secondary)]">
                          {item.currentLocation}
                        </td>
                        <td className="table-col-left text-[var(--text-secondary)]">
                          {item.targetLocation}
                        </td>
                        <td className="table-col-left text-[var(--text-secondary)]">
                          {item.note ? (
                            <p className="table-cell-note max-w-[20rem]">{item.note}</p>
                          ) : (
                            "-"
                          )}
                        </td>
                        {!isReadOnly ? (
                          <td className="table-col-actions">
                          <div className="table-action-slot">
                            <RowActionMenu
                              description={`${item.currentLocation} → ${item.targetLocation}`}
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
                          <StatusBadge tone={MOVE_ITEM_STATUS_TONES[item.status]}>
                            {MOVE_ITEM_STATUS_LABELS[item.status]}
                          </StatusBadge>
                          <p className="table-cell-title text-base">{item.name}</p>
                        </div>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                          {item.currentLocation} → {item.targetLocation}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <DetailRow label="현재 위치" value={item.currentLocation} />
                      <DetailRow label="이동할 위치" value={item.targetLocation} />
                      <DetailRow label="메모" value={item.note || "-"} />
                    </div>
                  </div>

                  {!isReadOnly ? (
                    <RowActionMenu
                      description={`${item.currentLocation} → ${item.targetLocation}`}
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
          title={editingItem ? "이동 항목 수정" : "이동 항목 추가"}
          description="현재 위치와 이동할 위치를 함께 정리해두면 이사 당일 동선이 훨씬 깔끔해져요."
          onClose={() => setIsDialogOpen(false)}
        >
          <form className="grid gap-4" onSubmit={handleSubmit}>
          <Field label="품목명">
            <TextInput
              required
              autoFocus
              placeholder="예: 계절 옷 박스"
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

            <Field label="이동할 위치">
              <SelectInput
                value={form.targetLocation}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    targetLocation: event.target.value as SellLocation,
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
          </div>

          <Field label="상태">
            <SelectInput
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as MoveItemStatus,
                }))
              }
            >
              {MOVE_ITEM_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {MOVE_ITEM_STATUS_LABELS[status]}
                </option>
              ))}
            </SelectInput>
          </Field>

          <Field label="메모">
            <TextArea
              placeholder="분류 기준, 포장 상태, 함께 옮길 묶음 등을 적어두세요."
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
            submitLabel={editingItem ? "수정 저장" : "이동 항목 추가"}
          />
          </form>
        </FormDialog>
      ) : null}
    </>
  );
}
