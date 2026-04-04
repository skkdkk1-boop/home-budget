"use client";

import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import type {
  SellItem,
  SellItemFormValues,
  SellItemSortOption,
  SellItemStatus,
  SellLocation,
} from "@/lib/planner-types";
import {
  SELL_ITEM_STATUS_LABELS,
  SELL_ITEM_STATUS_OPTIONS,
  SELL_ITEM_STATUS_TONES,
  SELL_LOCATION_OPTIONS,
} from "@/lib/planner-types";
import {
  compareDateAsc,
  compareRecent,
  formatCurrency,
  formatDate,
  keepVisibleSelections,
  toggleAllVisibleSelections,
  toggleSelectionItem,
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
  SectionHeader,
  SegmentedControl,
  SegmentedControlButton,
  SelectionCheckbox,
  SelectInput,
  StatusBadge,
  TableContainer,
  TextArea,
  TextInput,
} from "./ui";

type SellInputMode = "single" | "multi";
type MultiSellColumn =
  | "name"
  | "currentLocation"
  | "status"
  | "askingPrice"
  | "minimumPrice"
  | "sellByDate"
  | "platform";

type MultiSellRow = {
  id: string;
  name: string;
  currentLocation: SellLocation | "";
  status: SellItemStatus;
  askingPrice: string;
  minimumPrice: string;
  sellByDate: string;
  platform: string;
};

type MultiSellRowErrors = Partial<Record<MultiSellColumn, string>>;

const multiSellColumns: MultiSellColumn[] = [
  "name",
  "currentLocation",
  "status",
  "askingPrice",
  "minimumPrice",
  "sellByDate",
  "platform",
];

function createEmptySellItemForm(): SellItemFormValues {
  return {
    name: "",
    currentLocation: SELL_LOCATION_OPTIONS[0],
    askingPrice: 0,
    minimumPrice: 0,
    sellByDate: "",
    status: "planned",
    platform: "",
    note: "",
  };
}

function createMultiSellRow(): MultiSellRow {
  return {
    id: `multi-sell-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    currentLocation: "",
    status: "planned",
    askingPrice: "",
    minimumPrice: "",
    sellByDate: "",
    platform: "",
  };
}

function isMeaningfulMultiSellRow(row: MultiSellRow) {
  return Boolean(
    row.name.trim() ||
      row.currentLocation ||
      row.askingPrice.trim() ||
      row.minimumPrice.trim() ||
      row.sellByDate.trim() ||
      row.platform.trim(),
  );
}

function validateMultiSellRows(rows: MultiSellRow[]) {
  const rowErrors: Record<string, MultiSellRowErrors> = {};
  const items: SellItemFormValues[] = [];
  let firstInvalidField:
    | {
        rowId: string;
        column: MultiSellColumn;
      }
    | undefined;

  const meaningfulRows = rows.filter(isMeaningfulMultiSellRow);

  if (meaningfulRows.length === 0) {
    return {
      items,
      rowErrors,
      globalError: "최소 한 줄 이상 입력해주세요.",
      firstInvalidField: undefined,
    };
  }

  meaningfulRows.forEach((row) => {
    const errors: MultiSellRowErrors = {};
    const askingPrice = Number(row.askingPrice.replace(/[^\d.-]/g, ""));
    const minimumPrice = row.minimumPrice.trim()
      ? Number(row.minimumPrice.replace(/[^\d.-]/g, ""))
      : 0;

    if (!row.name.trim()) {
      errors.name = "품목명을 입력해주세요.";
    }

    if (
      !row.currentLocation ||
      !SELL_LOCATION_OPTIONS.includes(row.currentLocation as SellLocation)
    ) {
      errors.currentLocation = "현재 위치를 선택해주세요.";
    }

    if (
      !SELL_ITEM_STATUS_OPTIONS.includes(row.status as SellItemStatus)
    ) {
      errors.status = "상태를 확인해주세요.";
    }

    if (!row.askingPrice.trim() || !Number.isFinite(askingPrice) || askingPrice < 0) {
      errors.askingPrice = "희망 가격을 확인해주세요.";
    }

    if (
      row.minimumPrice.trim() &&
      (!Number.isFinite(minimumPrice) || minimumPrice < 0)
    ) {
      errors.minimumPrice = "최소 가격을 확인해주세요.";
    }

    if (Object.keys(errors).length > 0) {
      rowErrors[row.id] = errors;

      if (!firstInvalidField) {
        const invalidColumn = multiSellColumns.find((column) => errors[column]);

        if (invalidColumn) {
          firstInvalidField = {
            rowId: row.id,
            column: invalidColumn,
          };
        }
      }

      return;
    }

    items.push({
      name: row.name.trim(),
      currentLocation: row.currentLocation as SellLocation,
      status: row.status,
      askingPrice,
      minimumPrice,
      sellByDate: row.sellByDate,
      platform: row.platform.trim(),
      note: "",
    });
  });

  return {
    items,
    rowErrors,
    globalError: null,
    firstInvalidField,
  };
}

export function MovingSalesSection() {
  const {
    data,
    isReady,
    addSellItem,
    addSellItems,
    updateSellItem,
    updateSellItemStatuses,
    deleteSellItem,
    deleteSellItems,
  } = usePlannerData();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SellItem | null>(null);
  const [inputMode, setInputMode] = useState<SellInputMode>("single");
  const [locationFilter, setLocationFilter] = useState<SellLocation | "all">("all");
  const [statusFilter, setStatusFilter] = useState<SellItemStatus | "all">("all");
  const [sortBy, setSortBy] = useState<SellItemSortOption>("recent");
  const [selectedSellIds, setSelectedSellIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<SellItemStatus>("planned");
  const [form, setForm] = useState<SellItemFormValues>(createEmptySellItemForm);
  const [multiRows, setMultiRows] = useState<MultiSellRow[]>([createMultiSellRow()]);
  const [multiRowErrors, setMultiRowErrors] = useState<
    Record<string, MultiSellRowErrors>
  >({});
  const [multiTableError, setMultiTableError] = useState<string | null>(null);
  const multiCellRefs = useRef<
    Record<string, HTMLInputElement | HTMLSelectElement | null>
  >({});
  const pendingMultiFocusRef = useRef<{
    rowId: string;
    column: MultiSellColumn;
  } | null>(null);

  const filteredSellItems = useMemo(() => {
    const nextItems = data.sellItems.filter((item) => {
      const matchesLocation =
        locationFilter === "all" ? true : item.currentLocation === locationFilter;
      const matchesStatus = statusFilter === "all" ? true : item.status === statusFilter;

      return matchesLocation && matchesStatus;
    });

    nextItems.sort((left, right) => {
      if (sortBy === "deadline") {
        return compareDateAsc(left.sellByDate, right.sellByDate) || compareRecent(left, right);
      }

      if (sortBy === "priceHigh") {
        return right.askingPrice - left.askingPrice || compareRecent(left, right);
      }

      if (sortBy === "priceLow") {
        return left.askingPrice - right.askingPrice || compareRecent(left, right);
      }

      return compareRecent(left, right);
    });

    return nextItems;
  }, [data.sellItems, locationFilter, sortBy, statusFilter]);

  const platformSuggestions = useMemo(() => {
    return Array.from(new Set(data.sellItems.map((item) => item.platform.trim())))
      .filter(Boolean)
      .slice(0, 12);
  }, [data.sellItems]);

  const sellNameSuggestions = useMemo(() => {
    return Array.from(new Set(data.sellItems.map((item) => item.name.trim())))
      .filter(Boolean)
      .slice(0, 20);
  }, [data.sellItems]);

  const visibleSellIds = filteredSellItems.map((item) => item.id);
  const selectedVisibleCount = visibleSellIds.filter((id) =>
    selectedSellIds.includes(id),
  ).length;
  const isAllVisibleSelected =
    visibleSellIds.length > 0 &&
    visibleSellIds.every((id) => selectedSellIds.includes(id));
  const isSomeVisibleSelected =
    selectedVisibleCount > 0 && !isAllVisibleSelected;

  useEffect(() => {
    setSelectedSellIds((current) => {
      const next = keepVisibleSelections(current, visibleSellIds);

      if (JSON.stringify(current) === JSON.stringify(next)) {
        return current;
      }

      return next;
    });
  }, [visibleSellIds]);

  useEffect(() => {
    if (!isDialogOpen) {
      pendingMultiFocusRef.current = null;
      return;
    }

    const pendingFocus = pendingMultiFocusRef.current;

    if (!pendingFocus) {
      return;
    }

    const nextElement =
      multiCellRefs.current[`${pendingFocus.rowId}:${pendingFocus.column}`];

    if (!nextElement) {
      return;
    }

    pendingMultiFocusRef.current = null;

    requestAnimationFrame(() => {
      nextElement.focus();

      if (nextElement instanceof HTMLInputElement) {
        nextElement.select();
      }
    });
  }, [inputMode, isDialogOpen, multiRows]);

  const registerMultiCellRef =
    (rowId: string, column: MultiSellColumn) =>
    (element: HTMLInputElement | HTMLSelectElement | null) => {
      multiCellRefs.current[`${rowId}:${column}`] = element;
    };

  const focusMultiCell = (rowId: string, column: MultiSellColumn) => {
    const nextElement = multiCellRefs.current[`${rowId}:${column}`];

    if (nextElement) {
      nextElement.focus();

      if (nextElement instanceof HTMLInputElement) {
        nextElement.select();
      }

      pendingMultiFocusRef.current = null;
      return;
    }

    pendingMultiFocusRef.current = { rowId, column };
  };

  const appendMultiRow = (focusColumn: MultiSellColumn = "name") => {
    const nextRow = createMultiSellRow();

    focusMultiCell(nextRow.id, focusColumn);
    setMultiTableError(null);
    setMultiRows((current) => [...current, nextRow]);
  };

  const updateMultiRow = (
    rowId: string,
    key: keyof Omit<MultiSellRow, "id">,
    value: string,
  ) => {
    setMultiRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, [key]: value } : row)),
    );
    setMultiRowErrors((current) => {
      const next = { ...current };

      if (!next[rowId]) {
        return current;
      }

      delete next[rowId][key as MultiSellColumn];

      if (next[rowId] && Object.keys(next[rowId]).length === 0) {
        delete next[rowId];
      }

      return next;
    });
    setMultiTableError(null);
  };

  const handleMultiCellKeyDown = (
    event: ReactKeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    rowIndex: number,
    column: MultiSellColumn,
  ) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    const nextRow = multiRows[rowIndex + 1];

    if (nextRow) {
      focusMultiCell(nextRow.id, column);
      return;
    }

    appendMultiRow(column);
  };

  const resetMultiEntry = () => {
    setMultiRows([createMultiSellRow()]);
    setMultiRowErrors({});
    setMultiTableError(null);
    pendingMultiFocusRef.current = null;
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setInputMode("single");
    setForm(createEmptySellItemForm());
    resetMultiEntry();
  };

  const startCreate = () => {
    setEditingItem(null);
    setInputMode("single");
    setForm(createEmptySellItemForm());
    resetMultiEntry();
    setIsDialogOpen(true);
  };

  const startEdit = (item: SellItem) => {
    setEditingItem(item);
    setInputMode("single");
    setMultiRowErrors({});
    setMultiTableError(null);
    pendingMultiFocusRef.current = null;
    setForm({
      name: item.name,
      currentLocation: item.currentLocation,
      askingPrice: item.askingPrice,
      minimumPrice: item.minimumPrice,
      sellByDate: item.sellByDate,
      status: item.status,
      platform: item.platform,
      note: item.note,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (inputMode === "multi" && !editingItem) {
      const validation = validateMultiSellRows(multiRows);

      setMultiRowErrors(validation.rowErrors);
      setMultiTableError(validation.globalError);

      if (validation.firstInvalidField) {
        focusMultiCell(
          validation.firstInvalidField.rowId,
          validation.firstInvalidField.column,
        );
      }

      if (validation.globalError || Object.keys(validation.rowErrors).length > 0) {
        return;
      }

      addSellItems(validation.items);
      handleCloseDialog();
      return;
    }

    if (editingItem) {
      updateSellItem(editingItem.id, form);
    } else {
      addSellItem(form);
    }

    handleCloseDialog();
  };

  const requestDelete = (item: SellItem) => {
    if (window.confirm(`"${item.name}" 판매 항목을 삭제할까요?`)) {
      deleteSellItem(item.id);
      setSelectedSellIds((current) => current.filter((id) => id !== item.id));
    }
  };

  const toggleSellSelection = (sellId: string) => {
    setSelectedSellIds((current) => toggleSelectionItem(current, sellId));
  };

  const toggleSelectAllSells = () => {
    setSelectedSellIds((current) =>
      toggleAllVisibleSelections(current, visibleSellIds, isAllVisibleSelected),
    );
  };

  const clearSellSelection = () => {
    setSelectedSellIds([]);
  };

  const handleBulkDelete = () => {
    if (selectedSellIds.length === 0) {
      return;
    }

    if (window.confirm(`선택한 ${selectedSellIds.length}개 항목을 삭제할까요?`)) {
      deleteSellItems(selectedSellIds);
      clearSellSelection();
    }
  };

  const handleBulkStatusChange = () => {
    if (selectedSellIds.length === 0) {
      return;
    }

    updateSellItemStatuses(selectedSellIds, bulkStatus);
    clearSellSelection();
  };

  if (!isReady) {
    return (
      <div className="page-shell">
        <LoadingState />
      </div>
    );
  }

  return (
    <>
      <SectionHeader action={<Button onClick={startCreate}>판매 항목 추가</Button>} />

      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))] lg:items-end">
        <Field label="현재 위치">
          <SelectInput
            value={locationFilter}
            onChange={(event) =>
              setLocationFilter(event.target.value as SellLocation | "all")
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
              setStatusFilter(event.target.value as SellItemStatus | "all")
            }
          >
            <option value="all">전체 상태</option>
            {SELL_ITEM_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {SELL_ITEM_STATUS_LABELS[status]}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="정렬">
          <SelectInput
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as SellItemSortOption)}
          >
            <option value="recent">최근 등록순</option>
            <option value="deadline">마감일순</option>
            <option value="priceHigh">높은 가격순</option>
            <option value="priceLow">낮은 가격순</option>
          </SelectInput>
        </Field>
      </div>

      {selectedSellIds.length > 0 ? (
        <div className="mt-4">
          <BulkActionBar count={selectedSellIds.length} onClear={clearSellSelection}>
            <SelectInput
              className="h-10 min-w-[8.5rem] bg-[var(--surface)] text-sm"
              value={bulkStatus}
              onChange={(event) =>
                setBulkStatus(event.target.value as SellItemStatus)
              }
            >
              {SELL_ITEM_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {SELL_ITEM_STATUS_LABELS[status]}
                </option>
              ))}
            </SelectInput>
            <Button size="sm" variant="secondary" onClick={handleBulkStatusChange}>
              상태 변경
            </Button>
            <Button size="sm" variant="danger" onClick={handleBulkDelete}>
              선택 삭제
            </Button>
          </BulkActionBar>
        </div>
      ) : null}

      <div className="mt-4">
        {filteredSellItems.length === 0 ? (
          <EmptyState
            title="조건에 맞는 판매 항목이 없어요"
            description="판매할 품목을 추가하거나 필터를 조정해보세요."
          />
        ) : (
          <>
            <div className="hidden xl:block">
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
                            onChange={toggleSelectAllSells}
                          />
                        </div>
                      </th>
                      <th className="table-col-status">상태</th>
                      <th className="table-col-left">품목명</th>
                      <th className="table-col-left">현재 위치</th>
                      <th className="table-col-amount">희망 가격</th>
                      <th className="table-col-amount">최소 가격</th>
                      <th className="table-col-date">판매 마감일</th>
                      <th className="table-col-left">플랫폼</th>
                      <th className="table-col-left">메모</th>
                      <th className="table-col-actions">
                        <span className="sr-only">행 동작</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSellItems.map((item) => (
                      <tr key={item.id}>
                        <td className="table-col-select">
                          <div className="table-action-slot">
                            <SelectionCheckbox
                              aria-label={`${item.name} 선택`}
                              checked={selectedSellIds.includes(item.id)}
                              onChange={() => toggleSellSelection(item.id)}
                            />
                          </div>
                        </td>
                        <td className="table-col-status">
                          <StatusBadge tone={SELL_ITEM_STATUS_TONES[item.status]}>
                            {SELL_ITEM_STATUS_LABELS[item.status]}
                          </StatusBadge>
                        </td>
                        <td className="table-col-left">
                          <p className="table-cell-title">{item.name}</p>
                        </td>
                        <td className="table-col-left text-[var(--text-secondary)]">
                          {item.currentLocation}
                        </td>
                        <td className="table-col-amount numeric-value font-semibold text-[var(--text-primary)]">
                          {formatCurrency(item.askingPrice)}
                        </td>
                        <td className="table-col-amount numeric-value text-[var(--text-secondary)]">
                          {formatCurrency(item.minimumPrice)}
                        </td>
                        <td className="table-col-date text-[var(--text-primary)]">
                          {formatDate(item.sellByDate)}
                        </td>
                        <td className="table-col-left text-[var(--text-secondary)]">
                          {item.platform || "-"}
                        </td>
                        <td className="table-col-left text-[var(--text-secondary)]">
                          {item.note ? (
                            <p className="table-cell-note max-w-[20rem]">{item.note}</p>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="table-col-actions">
                          <div className="table-action-slot">
                            <RowActionMenu
                              description={`${item.currentLocation} · ${SELL_ITEM_STATUS_LABELS[item.status]}`}
                              label={item.name}
                              mode="desktop"
                              onDelete={() => requestDelete(item)}
                              onEdit={() => startEdit(item)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableContainer>
            </div>

            <div className="grid gap-3 xl:hidden">
              {filteredSellItems.map((item) => (
                <article
                  key={item.id}
                  className="planner-mobile-card relative p-4 sm:p-5"
                >
                  <div className="absolute left-4 top-4 z-10">
                    <SelectionCheckbox
                      aria-label={`${item.name} 선택`}
                      checked={selectedSellIds.includes(item.id)}
                      onChange={() => toggleSellSelection(item.id)}
                    />
                  </div>

                  <div className="pl-8 pr-12">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge tone={SELL_ITEM_STATUS_TONES[item.status]}>
                            {SELL_ITEM_STATUS_LABELS[item.status]}
                          </StatusBadge>
                          <p className="table-cell-title text-base">{item.name}</p>
                        </div>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                          {item.currentLocation}
                          {item.platform ? ` · ${item.platform}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="numeric-value text-sm font-semibold text-[var(--text-primary)]">
                          {formatCurrency(item.askingPrice)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">희망 가격</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <DetailRow
                        label="최소 가격"
                        value={<span className="numeric-value">{formatCurrency(item.minimumPrice)}</span>}
                      />
                      <DetailRow label="판매 마감일" value={formatDate(item.sellByDate)} />
                      <DetailRow label="메모" value={item.note || "-"} />
                    </div>
                  </div>

                  <RowActionMenu
                    description={`${item.currentLocation} · ${SELL_ITEM_STATUS_LABELS[item.status]}`}
                    label={item.name}
                    mode="mobile"
                    onDelete={() => requestDelete(item)}
                    onEdit={() => startEdit(item)}
                    triggerClassName="absolute right-4 top-4"
                  />
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      <FormDialog
        open={isDialogOpen}
        title={editingItem ? "판매 항목 수정" : "판매 항목 추가"}
        description="품목 정보와 희망 가격, 판매 마감일을 함께 적어두면 이사 정리가 훨씬 쉬워져요."
        onClose={handleCloseDialog}
        panelClassName={inputMode === "multi" && !editingItem ? "!max-w-[72rem]" : undefined}
        bodyClassName={inputMode === "multi" && !editingItem ? "px-4 py-4 sm:px-5" : undefined}
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          {!editingItem ? (
            <SegmentedControl>
              <SegmentedControlButton
                active={inputMode === "single"}
                onClick={() => setInputMode("single")}
              >
                한 개 입력
              </SegmentedControlButton>
              <SegmentedControlButton
                active={inputMode === "multi"}
                onClick={() => {
                  setInputMode("multi");
                  pendingMultiFocusRef.current = {
                    rowId: multiRows[0]?.id ?? createMultiSellRow().id,
                    column: "name",
                  };
                  setMultiTableError(null);
                }}
              >
                여러 개 입력
              </SegmentedControlButton>
            </SegmentedControl>
          ) : null}

          {inputMode === "multi" && !editingItem ? (
            <div className="planner-panel-muted p-3.5 sm:p-4">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  여러 개 입력
                </p>
                <p className="text-[13px] leading-6 text-[var(--text-label)]">
                  `Tab`으로 다음 칸, `Enter`로 같은 열의 다음 행으로 빠르게 입력할 수 있어요.
                  최소 가격, 마감일, 플랫폼은 필요할 때만 적고 메모는 추가 후 개별 수정에서
                  보완할 수 있습니다.
                </p>
              </div>

              <datalist id="sell-name-suggestions">
                {sellNameSuggestions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <datalist id="sell-platform-suggestions">
                {platformSuggestions.map((platform) => (
                  <option key={platform} value={platform} />
                ))}
              </datalist>

              <div className="mt-3 overflow-x-auto lg:overflow-visible">
                <TableContainer className="entry-grid-shell min-w-[62rem] lg:min-w-0">
                  <table className="data-table entry-grid-table">
                    <colgroup>
                      <col style={{ width: "22%" }} />
                      <col style={{ width: "13%" }} />
                      <col style={{ width: "13%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "12%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "12%" }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="table-col-left">품목명</th>
                        <th className="table-col-left">현재 위치</th>
                        <th className="table-col-center">상태</th>
                        <th className="table-col-right">희망 가격</th>
                        <th className="table-col-right">최소 가격</th>
                        <th className="table-col-center">판매 마감일</th>
                        <th className="table-col-left">플랫폼</th>
                      </tr>
                    </thead>
                    <tbody>
                      {multiRows.map((row, rowIndex) => {
                        const rowErrors = multiRowErrors[row.id];
                        const rowErrorMessage = rowErrors
                          ? Object.values(rowErrors).join(" · ")
                          : null;

                        return (
                          <Fragment key={row.id}>
                            <tr>
                              <td className="table-col-left">
                                <TextInput
                                  ref={registerMultiCellRef(row.id, "name")}
                                  className={
                                    rowErrors?.name
                                      ? "entry-grid-control w-full border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[color-mix(in_srgb,var(--danger)_12%,white)]"
                                      : "entry-grid-control w-full"
                                  }
                                  list="sell-name-suggestions"
                                  placeholder="예: 원목 수납장"
                                  value={row.name}
                                  onChange={(event) =>
                                    updateMultiRow(row.id, "name", event.target.value)
                                  }
                                  onKeyDown={(event) =>
                                    handleMultiCellKeyDown(event, rowIndex, "name")
                                  }
                                />
                              </td>
                              <td className="table-col-left">
                                <SelectInput
                                  ref={registerMultiCellRef(row.id, "currentLocation")}
                                  className={
                                    rowErrors?.currentLocation
                                      ? "entry-grid-control entry-grid-select w-full border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[color-mix(in_srgb,var(--danger)_12%,white)]"
                                      : "entry-grid-control entry-grid-select w-full"
                                  }
                                  value={row.currentLocation}
                                  onChange={(event) =>
                                    updateMultiRow(
                                      row.id,
                                      "currentLocation",
                                      event.target.value,
                                    )
                                  }
                                  onKeyDown={(event) =>
                                    handleMultiCellKeyDown(
                                      event,
                                      rowIndex,
                                      "currentLocation",
                                    )
                                  }
                                >
                                  <option value="">선택</option>
                                  {SELL_LOCATION_OPTIONS.map((location) => (
                                    <option key={location} value={location}>
                                      {location}
                                    </option>
                                  ))}
                                </SelectInput>
                              </td>
                              <td className="table-col-center">
                                <SelectInput
                                  ref={registerMultiCellRef(row.id, "status")}
                                  className={
                                    rowErrors?.status
                                      ? "entry-grid-control entry-grid-select w-full border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[color-mix(in_srgb,var(--danger)_12%,white)]"
                                      : "entry-grid-control entry-grid-select w-full"
                                  }
                                  value={row.status}
                                  onChange={(event) =>
                                    updateMultiRow(row.id, "status", event.target.value)
                                  }
                                  onKeyDown={(event) =>
                                    handleMultiCellKeyDown(event, rowIndex, "status")
                                  }
                                >
                                  {SELL_ITEM_STATUS_OPTIONS.map((status) => (
                                    <option key={status} value={status}>
                                      {SELL_ITEM_STATUS_LABELS[status]}
                                    </option>
                                  ))}
                                </SelectInput>
                              </td>
                              <td className="table-col-right">
                                <TextInput
                                  ref={registerMultiCellRef(row.id, "askingPrice")}
                                  className={
                                    rowErrors?.askingPrice
                                      ? "entry-grid-control w-full border-[var(--danger)] text-right focus:border-[var(--danger)] focus:ring-[color-mix(in_srgb,var(--danger)_12%,white)]"
                                      : "entry-grid-control w-full text-right"
                                  }
                                  inputMode="numeric"
                                  min="0"
                                  placeholder="0"
                                  type="number"
                                  value={row.askingPrice}
                                  onChange={(event) =>
                                    updateMultiRow(
                                      row.id,
                                      "askingPrice",
                                      event.target.value,
                                    )
                                  }
                                  onKeyDown={(event) =>
                                    handleMultiCellKeyDown(
                                      event,
                                      rowIndex,
                                      "askingPrice",
                                    )
                                  }
                                />
                              </td>
                              <td className="table-col-right">
                                <TextInput
                                  ref={registerMultiCellRef(row.id, "minimumPrice")}
                                  className={
                                    rowErrors?.minimumPrice
                                      ? "entry-grid-control w-full border-[var(--danger)] text-right focus:border-[var(--danger)] focus:ring-[color-mix(in_srgb,var(--danger)_12%,white)]"
                                      : "entry-grid-control w-full text-right"
                                  }
                                  inputMode="numeric"
                                  min="0"
                                  placeholder="선택"
                                  type="number"
                                  value={row.minimumPrice}
                                  onChange={(event) =>
                                    updateMultiRow(
                                      row.id,
                                      "minimumPrice",
                                      event.target.value,
                                    )
                                  }
                                  onKeyDown={(event) =>
                                    handleMultiCellKeyDown(
                                      event,
                                      rowIndex,
                                      "minimumPrice",
                                    )
                                  }
                                />
                              </td>
                              <td className="table-col-center">
                                <TextInput
                                  ref={registerMultiCellRef(row.id, "sellByDate")}
                                  className="entry-grid-control w-full"
                                  type="date"
                                  value={row.sellByDate}
                                  onChange={(event) =>
                                    updateMultiRow(
                                      row.id,
                                      "sellByDate",
                                      event.target.value,
                                    )
                                  }
                                  onKeyDown={(event) =>
                                    handleMultiCellKeyDown(
                                      event,
                                      rowIndex,
                                      "sellByDate",
                                    )
                                  }
                                />
                              </td>
                              <td className="table-col-left">
                                <TextInput
                                  ref={registerMultiCellRef(row.id, "platform")}
                                  className="entry-grid-control w-full"
                                  list="sell-platform-suggestions"
                                  placeholder="예: 당근"
                                  value={row.platform}
                                  onChange={(event) =>
                                    updateMultiRow(row.id, "platform", event.target.value)
                                  }
                                  onKeyDown={(event) =>
                                    handleMultiCellKeyDown(event, rowIndex, "platform")
                                  }
                                />
                              </td>
                            </tr>
                            {rowErrorMessage ? (
                              <tr className="entry-grid-error">
                                <td colSpan={7} className="px-4 sm:px-5">
                                  {rowIndex + 1}행: {rowErrorMessage}
                                </td>
                              </tr>
                            ) : null}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </TableContainer>
              </div>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[12px] leading-5 text-[var(--text-muted)]">
                    마지막 행에서 `Enter`를 누르면 새 행이 자동으로 추가됩니다. 비어 있는
                    행은 저장할 때 자동으로 무시됩니다.
                  </p>
                  {multiTableError ? (
                    <p className="mt-2 text-sm leading-6 text-[var(--danger)]">
                      {multiTableError}
                    </p>
                  ) : null}
                </div>
                <Button size="sm" variant="secondary" onClick={() => appendMultiRow()}>
                  + 행 추가
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Field label="품목명">
                <TextInput
                  required
                  autoFocus
                  placeholder="예: 원목 수납장"
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
                        status: event.target.value as SellItemStatus,
                      }))
                    }
                  >
                    {SELL_ITEM_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {SELL_ITEM_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="희망 가격">
                  <TextInput
                    required
                    inputMode="numeric"
                    min="0"
                    step="1000"
                    type="number"
                    value={form.askingPrice}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        askingPrice: Number(event.target.value),
                      }))
                    }
                  />
                </Field>

                <Field label="최소 가격">
                  <TextInput
                    required
                    inputMode="numeric"
                    min="0"
                    step="1000"
                    type="number"
                    value={form.minimumPrice}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        minimumPrice: Number(event.target.value),
                      }))
                    }
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="판매 마감일">
                  <TextInput
                    required
                    type="date"
                    value={form.sellByDate}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        sellByDate: event.target.value,
                      }))
                    }
                  />
                </Field>

                <Field label="플랫폼" hint="예: 당근, 번개장터, 직거래">
                  <TextInput
                    list="sell-platform-suggestions"
                    placeholder="예: 당근"
                    value={form.platform}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        platform: event.target.value,
                      }))
                    }
                  />
                  <datalist id="sell-platform-suggestions">
                    {platformSuggestions.map((platform) => (
                      <option key={platform} value={platform} />
                    ))}
                  </datalist>
                </Field>
              </div>

              <Field label="메모">
                <TextArea
                  placeholder="구성품 여부, 픽업 가능 시간, 흠집 상태 등을 적어두세요."
                  value={form.note}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                />
              </Field>
            </>
          )}

          <DialogActions
            onCancel={handleCloseDialog}
            submitLabel={
              editingItem
                ? "수정 저장"
                : inputMode === "multi"
                  ? "판매 항목 일괄 추가"
                  : "판매 항목 추가"
            }
          />
        </form>
      </FormDialog>
    </>
  );
}
