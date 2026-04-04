"use client";

import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import Link from "next/link";
import {
  Fragment,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  ConstructionStatus,
  Purchase,
  PurchaseCategory,
  PurchaseFormValues,
  PurchaseRoom,
  PurchaseSortOption,
  PurchaseStatus,
  Room,
} from "@/lib/planner-types";
import {
  CONSTRUCTION_STATUS_LABELS,
  CONSTRUCTION_STATUS_OPTIONS,
  PAYMENT_TYPE_LABELS,
  PURCHASE_CATEGORY_OPTIONS,
  PURCHASE_MULTI_ROOM_OPTIONS,
  PURCHASE_STATUS_LABELS,
  PURCHASE_STATUS_OPTIONS,
  PURCHASE_STATUS_TONES,
  ROOM_OPTIONS,
} from "@/lib/planner-types";
import {
  calculatePurchaseAmounts,
  compareRecent,
  formatCurrency,
  formatDate,
  keepVisibleSelections,
  parseMoneyInput,
  parsePurchaseBulkInput,
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
  MoneyInput,
  RowActionMenu,
  SegmentedControl,
  SegmentedControlButton,
  SelectionCheckbox,
  SelectInput,
  SectionHeader,
  StatusBadge,
  SummaryCard,
  SummaryChip,
  SurfaceCard,
  TableContainer,
  TextArea,
  TextInput,
} from "./ui";

type PurchaseInputMode = "single" | "multi";
type MultiEntryMode = "table" | "advanced";
type MultiPurchaseColumn = "name" | "room" | "category" | "unitPrice" | "quantity";
type MultiPurchaseRow = {
  id: string;
  name: string;
  room: PurchaseRoom | "";
  category: PurchaseCategory | "";
  unitPrice: string;
  quantity: string;
};
type MultiPurchaseRowErrors = Partial<Record<MultiPurchaseColumn, string>>;

type PurchaseFormState = Omit<
  PurchaseFormValues,
  "unitPrice" | "constructionTotalCost" | "constructionDeposit" | "constructionBalance"
> & {
  unitPrice: string;
  constructionTotalCost: string;
  constructionDeposit: string;
  constructionBalance: string;
};

const multiPurchaseColumns: MultiPurchaseColumn[] = [
  "name",
  "room",
  "category",
  "unitPrice",
  "quantity",
];
const multiPurchaseRoomOptions = PURCHASE_MULTI_ROOM_OPTIONS;

function createMultiPurchaseRow(): MultiPurchaseRow {
  return {
    id: `multi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    room: "",
    category: "",
    unitPrice: "",
    quantity: "1",
  };
}

function isMeaningfulMultiRow(row: MultiPurchaseRow) {
  return Boolean(
    row.name.trim() ||
      row.room ||
      row.category ||
      row.unitPrice.trim() ||
      (row.quantity.trim() && row.quantity.trim() !== "1"),
  );
}

function validateMultiPurchaseRows(rows: MultiPurchaseRow[]) {
  const rowErrors: Record<string, MultiPurchaseRowErrors> = {};
  const items: PurchaseFormValues[] = [];
  let firstInvalidField:
    | {
        rowId: string;
        column: MultiPurchaseColumn;
      }
    | undefined;

  const meaningfulRows = rows.filter(isMeaningfulMultiRow);

  if (meaningfulRows.length === 0) {
    return {
      items,
      rowErrors,
      globalError: "최소 한 줄 이상 입력해주세요.",
      firstInvalidField: undefined,
    };
  }

  meaningfulRows.forEach((row) => {
    const errors: MultiPurchaseRowErrors = {};
    const unitPrice = Number(row.unitPrice.replace(/[^\d.-]/g, ""));
    const quantity = Number(row.quantity.replace(/[^\d.-]/g, ""));

    if (!row.name.trim()) {
      errors.name = "품목명을 입력해주세요.";
    }

    if (
      !row.room ||
      !multiPurchaseRoomOptions.includes(row.room as PurchaseRoom)
    ) {
      errors.room = "공간을 선택해주세요.";
    }

    if (
      !row.category ||
      !PURCHASE_CATEGORY_OPTIONS.includes(row.category as PurchaseCategory)
    ) {
      errors.category = "유형을 선택해주세요.";
    }

    if (!row.unitPrice.trim() || !Number.isFinite(unitPrice) || unitPrice < 0) {
      errors.unitPrice = "가격을 확인해주세요.";
    }

    if (!row.quantity.trim() || !Number.isFinite(quantity) || quantity < 1) {
      errors.quantity = "수량은 1 이상이어야 해요.";
    }

    if (Object.keys(errors).length > 0) {
      rowErrors[row.id] = errors;

      if (!firstInvalidField) {
        const invalidColumn = multiPurchaseColumns.find((column) => errors[column]);

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
      status: "planned",
      room: row.room as PurchaseRoom,
      category: row.category as PurchaseCategory,
      name: row.name.trim(),
      unitPrice,
      quantity,
      paymentType: "lump",
      installmentMonths: 12,
      link: "",
      note: "",
      deliveryRequired: false,
      deliveryDate: "",
      constructionRequired: false,
      constructionStatus: undefined,
      constructionDate: "",
      constructionStartTime: "",
      constructionCompany: "",
      constructionTotalCost: 0,
      constructionDeposit: 0,
      constructionBalance: 0,
    });
  });

  return {
    items,
    rowErrors,
    globalError: null,
    firstInvalidField,
  };
}

function createEmptyPurchaseForm(): PurchaseFormState {
  return {
    status: "planned",
    room: ROOM_OPTIONS[0],
    category: "기타",
    name: "",
    unitPrice: "",
    quantity: 1,
    paymentType: "lump",
    installmentMonths: 12,
    link: "",
    note: "",
    deliveryRequired: false,
    deliveryDate: "",
    constructionRequired: false,
    constructionStatus: CONSTRUCTION_STATUS_OPTIONS[0],
    constructionDate: "",
    constructionStartTime: "",
    constructionCompany: "",
    constructionTotalCost: "",
    constructionDeposit: "",
    constructionBalance: "",
  };
}

function getPurchaseTimelineText(
  purchase: Pick<
    PurchaseFormValues,
    | "deliveryRequired"
    | "deliveryDate"
    | "constructionRequired"
    | "constructionDate"
    | "constructionStartTime"
  >,
) {
  const segments: string[] = [];

  if (purchase.deliveryRequired && purchase.deliveryDate) {
    segments.push(`배송 ${formatDate(purchase.deliveryDate)}`);
  }

  if (purchase.constructionRequired && purchase.constructionDate) {
    segments.push(
      `시공 ${formatDate(purchase.constructionDate)}${
        purchase.constructionStartTime ? ` ${purchase.constructionStartTime}` : ""
      }`,
    );
  }

  return segments.length > 0 ? segments.join(" · ") : null;
}

export function PurchasesSection() {
  const {
    data,
    isReady,
    addPurchase,
    addPurchases,
    updatePurchase,
    updatePurchaseStatuses,
    deletePurchase,
    deletePurchases,
  } = usePlannerData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [inputMode, setInputMode] = useState<PurchaseInputMode>("single");
  const [multiEntryMode, setMultiEntryMode] = useState<MultiEntryMode>("table");
  const [form, setForm] = useState<PurchaseFormState>(createEmptyPurchaseForm);
  const [multiRows, setMultiRows] = useState<MultiPurchaseRow[]>([
    createMultiPurchaseRow(),
  ]);
  const [multiRowErrors, setMultiRowErrors] = useState<
    Record<string, MultiPurchaseRowErrors>
  >({});
  const [multiTableError, setMultiTableError] = useState<string | null>(null);
  const [bulkInputText, setBulkInputText] = useState("");
  const [bulkInputError, setBulkInputError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [roomFilter, setRoomFilter] = useState<Room | "all">("all");
  const [categoryFilter, setCategoryFilter] =
    useState<PurchaseCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<PurchaseStatus | "all">("all");
  const [sortBy, setSortBy] = useState<PurchaseSortOption>("recent");
  const [selectedPurchaseIds, setSelectedPurchaseIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<"planned" | "completed">(
    "planned",
  );
  const multiCellRefs = useRef<
    Record<string, HTMLInputElement | HTMLSelectElement | null>
  >({});
  const pendingMultiFocusRef = useRef<{
    rowId: string;
    column: MultiPurchaseColumn;
  } | null>(null);

  useEffect(() => {
    if (!isDialogOpen) {
      pendingMultiFocusRef.current = null;
      setEditingPurchase(null);
      setIsDetailOpen(false);
      setInputMode("single");
      setMultiEntryMode("table");
      setMultiRows([createMultiPurchaseRow()]);
      setMultiRowErrors({});
      setMultiTableError(null);
      setBulkInputText("");
      setBulkInputError(null);
      setForm(createEmptyPurchaseForm());
      return;
    }

    if (editingPurchase) {
      pendingMultiFocusRef.current = null;
      setIsDetailOpen(true);
      setInputMode("single");
      setMultiEntryMode("table");
      setMultiRows([createMultiPurchaseRow()]);
      setMultiRowErrors({});
      setMultiTableError(null);
      setBulkInputError(null);
      setForm({
        status: editingPurchase.status,
        room: editingPurchase.room,
        category: editingPurchase.category,
        name: editingPurchase.name,
        unitPrice: String(editingPurchase.unitPrice),
        quantity: editingPurchase.quantity,
        paymentType: editingPurchase.paymentType,
        installmentMonths:
          editingPurchase.installmentMonths > 0
            ? editingPurchase.installmentMonths
            : 12,
        link: editingPurchase.link,
        note: editingPurchase.note,
        deliveryRequired: editingPurchase.deliveryRequired,
        deliveryDate: editingPurchase.deliveryDate,
        constructionRequired: editingPurchase.constructionRequired,
        constructionStatus:
          editingPurchase.constructionStatus ?? CONSTRUCTION_STATUS_OPTIONS[0],
        constructionDate: editingPurchase.constructionDate,
        constructionStartTime: editingPurchase.constructionStartTime,
        constructionCompany: editingPurchase.constructionCompany,
        constructionTotalCost: editingPurchase.constructionTotalCost
          ? String(editingPurchase.constructionTotalCost)
          : "",
        constructionDeposit: editingPurchase.constructionDeposit
          ? String(editingPurchase.constructionDeposit)
          : "",
        constructionBalance: editingPurchase.constructionBalance
          ? String(editingPurchase.constructionBalance)
          : "",
      });
      return;
    }

    pendingMultiFocusRef.current = null;
    setIsDetailOpen(false);
    setInputMode("single");
    setMultiEntryMode("table");
    setMultiRows([createMultiPurchaseRow()]);
    setMultiRowErrors({});
    setMultiTableError(null);
    setBulkInputText("");
    setBulkInputError(null);
    setForm(createEmptyPurchaseForm());
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

  useEffect(() => {
    setSelectedPurchaseIds((current) => {
      const next = keepVisibleSelections(
        current,
        filteredPurchases.map((item) => item.id),
      );

      if (
        current.length === next.length &&
        current.every((id, index) => id === next[index])
      ) {
        return current;
      }

      return next;
    });
  }, [filteredPurchases]);

  useEffect(() => {
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
  }, [inputMode, isDialogOpen, multiEntryMode, multiRows]);

  const draftAmounts = calculatePurchaseAmounts({
    ...form,
    unitPrice: parseMoneyInput(form.unitPrice),
  });
  const draftConstructionTotalCost = parseMoneyInput(form.constructionTotalCost);
  const draftConstructionDeposit = parseMoneyInput(form.constructionDeposit);
  const draftConstructionBalance = parseMoneyInput(form.constructionBalance);
  const isInstallment = form.paymentType === "installment";
  const visiblePurchaseIds = filteredPurchases.map((item) => item.id);
  const selectedVisibleCount = visiblePurchaseIds.filter((id) =>
    selectedPurchaseIds.includes(id),
  ).length;
  const isAllVisibleSelected =
    visiblePurchaseIds.length > 0 &&
    visiblePurchaseIds.every((id) => selectedPurchaseIds.includes(id));
  const isSomeVisibleSelected =
    selectedVisibleCount > 0 && !isAllVisibleSelected;
  const committedCount = data.purchases.filter(
    (item) => item.status !== "planned",
  ).length;
  const plannedCount = data.purchases.filter(
    (item) => item.status === "planned",
  ).length;
  const purchaseNameSuggestions = useMemo(() => {
    return Array.from(new Set(data.purchases.map((item) => item.name.trim())))
      .filter(Boolean)
      .slice(0, 24);
  }, [data.purchases]);
  const detailRoomOptions = useMemo(() => {
    if (ROOM_OPTIONS.includes(form.room as Room)) {
      return ROOM_OPTIONS;
    }

    return [...ROOM_OPTIONS, form.room] as const;
  }, [form.room]);
  const purchaseTimelineText = getPurchaseTimelineText(form);

  const registerMultiCellRef =
    (rowId: string, column: MultiPurchaseColumn) =>
    (element: HTMLInputElement | HTMLSelectElement | null) => {
      multiCellRefs.current[`${rowId}:${column}`] = element;
    };

  const focusMultiCell = (rowId: string, column: MultiPurchaseColumn) => {
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

  const appendMultiRow = (focusColumn: MultiPurchaseColumn = "name") => {
    const nextRow = createMultiPurchaseRow();

    focusMultiCell(nextRow.id, focusColumn);
    setMultiTableError(null);
    setMultiRows((current) => [...current, nextRow]);
  };

  const updateMultiRow = (
    rowId: string,
    key: keyof Omit<MultiPurchaseRow, "id">,
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

      delete next[rowId][key as MultiPurchaseColumn];

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
    column: MultiPurchaseColumn,
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

  const startCreate = () => {
    setEditingPurchase(null);
    setInputMode("single");
    setMultiEntryMode("table");
    setMultiRows([createMultiPurchaseRow()]);
    setMultiRowErrors({});
    setMultiTableError(null);
    setBulkInputText("");
    setBulkInputError(null);
    setIsDialogOpen(true);
  };

  const startEdit = (purchase: Purchase) => {
    setEditingPurchase(purchase);
    setIsDialogOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (inputMode === "multi" && !editingPurchase) {
      if (multiEntryMode === "table") {
        const validation = validateMultiPurchaseRows(multiRows);

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

        addPurchases(validation.items);
        setIsDialogOpen(false);

        return;
      }

      if (!bulkInputText.trim()) {
        setBulkInputError("입력할 항목을 한 줄 이상 붙여넣어주세요.");

        return;
      }

      const parsed = parsePurchaseBulkInput(bulkInputText);

      if (parsed.items.length > 0) {
        addPurchases(parsed.items);
      }

      if (parsed.errors.length > 0) {
        setBulkInputError(parsed.errors.slice(0, 3).join(" "));
        setBulkInputText(parsed.invalidLines.join("\n"));

        return;
      }

      setIsDialogOpen(false);

      return;
    }

    const nextInput: PurchaseFormValues = {
      ...form,
      unitPrice: parseMoneyInput(form.unitPrice),
      constructionTotalCost: parseMoneyInput(form.constructionTotalCost),
      constructionDeposit: parseMoneyInput(form.constructionDeposit),
      constructionBalance: parseMoneyInput(form.constructionBalance),
    };

    if (editingPurchase) {
      updatePurchase(editingPurchase.id, nextInput);
    } else {
      addPurchase(nextInput);
    }

    setIsDialogOpen(false);
  };
  const requestDelete = (purchase: Purchase) => {
    if (window.confirm(`"${purchase.name}" 항목을 삭제할까요?`)) {
      deletePurchase(purchase.id);
    }
  };

  const togglePurchaseSelection = (purchaseId: string) => {
    setSelectedPurchaseIds((current) =>
      toggleSelectionItem(current, purchaseId),
    );
  };

  const toggleSelectAllPurchases = () => {
    setSelectedPurchaseIds((current) =>
      toggleAllVisibleSelections(
        current,
        visiblePurchaseIds,
        isAllVisibleSelected,
      ),
    );
  };

  const clearPurchaseSelection = () => {
    setSelectedPurchaseIds([]);
  };

  const handleBulkDeletePurchases = () => {
    if (selectedPurchaseIds.length === 0) {
      return;
    }

    if (
      window.confirm(
        `선택한 ${selectedPurchaseIds.length}개 항목을 삭제할까요?`,
      )
    ) {
      deletePurchases(selectedPurchaseIds);
      clearPurchaseSelection();
    }
  };

  const handleBulkStatusChange = () => {
    if (selectedPurchaseIds.length === 0) {
      return;
    }

    updatePurchaseStatuses(selectedPurchaseIds, bulkStatus);
    clearPurchaseSelection();
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
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="전체 구매 항목"
          value={`${data.purchases.length}개`}
        />
        <SummaryCard
          label="필터 결과"
          value={`${filteredPurchases.length}개`}
        />
        <SummaryCard
          label="결제 완료"
          value={`${committedCount}개`}
        />
        <SummaryCard
          label="구매 예정"
          value={`${plannedCount}개`}
          tone="highlight"
        />
      </div>

      <SurfaceCard>
        <SectionHeader
          action={<Button onClick={startCreate}>구매 항목 추가</Button>}
        />

        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-[minmax(13rem,1.5fr)_repeat(4,minmax(7rem,0.92fr))_auto] lg:items-end">
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
                {PURCHASE_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {PURCHASE_STATUS_LABELS[status]}
                  </option>
                ))}
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

        {selectedPurchaseIds.length > 0 ? (
          <div className="mt-4">
            <BulkActionBar
              count={selectedPurchaseIds.length}
              onClear={clearPurchaseSelection}
            >
              <SelectInput
                className="h-10 min-w-[8.5rem] bg-[var(--surface)] text-sm"
                value={bulkStatus}
                onChange={(event) =>
                  setBulkStatus(event.target.value as "planned" | "completed")
                }
              >
                <option value="planned">구매 예정</option>
                <option value="completed">구매 완료</option>
              </SelectInput>
              <Button size="sm" variant="secondary" onClick={handleBulkStatusChange}>
                상태 변경
              </Button>
              <Button size="sm" variant="danger" onClick={handleBulkDeletePurchases}>
                선택 삭제
              </Button>
            </BulkActionBar>
          </div>
        ) : null}

        <div className="mt-4">
          {filteredPurchases.length === 0 ? (
            <EmptyState
              title="조건에 맞는 구매 항목이 없어요"
              description="검색어나 필터를 조정하거나 새로운 구매 항목을 추가해보세요."
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
                              onChange={() => toggleSelectAllPurchases()}
                            />
                          </div>
                        </th>
                        <th className="table-col-status">상태</th>
                        <th className="table-col-left">품목</th>
                        <th className="table-col-left">공간 / 유형</th>
                        <th className="table-col-qty">수량</th>
                        <th className="table-col-amount">총액</th>
                        <th className="table-col-payment">결제방식</th>
                        <th className="table-col-link">링크</th>
                        <th className="table-col-actions">
                          <span className="sr-only">행 동작</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPurchases.map((purchase) => (
                        <tr key={purchase.id}>
                          <td className="table-col-select">
                            <div className="table-action-slot">
                              <SelectionCheckbox
                                aria-label={`${purchase.name} 선택`}
                                checked={selectedPurchaseIds.includes(purchase.id)}
                                onChange={() => togglePurchaseSelection(purchase.id)}
                              />
                            </div>
                          </td>
                          <td className="table-col-status">
                            <StatusBadge tone={PURCHASE_STATUS_TONES[purchase.status]}>
                              {PURCHASE_STATUS_LABELS[purchase.status]}
                            </StatusBadge>
                          </td>
                          <td className="table-col-left">
                            <div className="table-cell-stack max-w-[19rem]">
                              <p className="table-cell-title">{purchase.name}</p>
                              {purchase.note ? (
                                <p className="table-cell-note">{purchase.note}</p>
                              ) : null}
                            </div>
                          </td>
                          <td className="table-col-left">
                            <div className="table-cell-stack">
                              <p className="table-cell-meta">
                                {purchase.room} · {purchase.category}
                              </p>
                              {getPurchaseTimelineText(purchase) ? (
                                <p className="table-cell-note">
                                  {getPurchaseTimelineText(purchase)}
                                </p>
                              ) : null}
                            </div>
                          </td>
                          <td className="table-col-qty numeric-value text-[var(--text-secondary)]">
                            {purchase.quantity}개
                          </td>
                          <td className="table-col-amount">
                            <div className="table-cell-stack items-end">
                              <p className="numeric-value font-semibold text-[var(--text-primary)]">
                                {formatCurrency(purchase.totalPrice)}
                              </p>
                              <p className="numeric-value text-sm text-[var(--text-secondary)]">
                                {formatCurrency(purchase.unitPrice)} × {purchase.quantity}
                              </p>
                            </div>
                          </td>
                          <td className="table-col-payment text-[var(--text-secondary)]">
                            <div className="table-cell-stack items-center">
                              <p className="font-medium text-[var(--text-primary)]">
                                {PAYMENT_TYPE_LABELS[purchase.paymentType]}
                              </p>
                              <p className="numeric-value text-sm">
                                {purchase.paymentType === "installment"
                                  ? `${purchase.installmentMonths}개월 · ${formatCurrency(
                                      purchase.monthlyPayment,
                                    )}`
                                  : "-"}
                              </p>
                            </div>
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
                            <div className="table-action-slot">
                              <RowActionMenu
                                description={`${purchase.room} · ${purchase.category}`}
                                label={purchase.name}
                                mode="desktop"
                                onDelete={() => requestDelete(purchase)}
                                onEdit={() => startEdit(purchase)}
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
                {filteredPurchases.map((purchase) => (
                  <details
                    key={purchase.id}
                    className="planner-mobile-card relative p-4 sm:p-5"
                  >
                    <div className="absolute left-4 top-4 z-10">
                      <SelectionCheckbox
                        aria-label={`${purchase.name} 선택`}
                        checked={selectedPurchaseIds.includes(purchase.id)}
                        onChange={() => togglePurchaseSelection(purchase.id)}
                        onClick={(event) => event.stopPropagation()}
                      />
                    </div>

                    <summary className="list-none cursor-pointer pl-8 pr-12">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge tone={PURCHASE_STATUS_TONES[purchase.status]}>
                              {PURCHASE_STATUS_LABELS[purchase.status]}
                            </StatusBadge>
                            <p className="table-cell-title truncate text-base">
                              {purchase.name}
                            </p>
                          </div>
                          <p className="mt-2 text-sm text-[var(--text-secondary)]">
                            {purchase.room} · {purchase.category}
                          </p>
                          {getPurchaseTimelineText(purchase) ? (
                            <p className="mt-1 text-xs text-[var(--text-muted)]">
                              {getPurchaseTimelineText(purchase)}
                            </p>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="numeric-value text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                            {formatCurrency(purchase.totalPrice)}
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">상세 보기</p>
                        </div>
                      </div>
                    </summary>
                    <RowActionMenu
                      description={`${purchase.room} · ${purchase.category}`}
                      label={purchase.name}
                      mode="mobile"
                      onDelete={() => requestDelete(purchase)}
                      onEdit={() => startEdit(purchase)}
                      triggerClassName="absolute right-4 top-4"
                    />

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
                          label="일정"
                          value={
                            getPurchaseTimelineText(purchase) ?? "-"
                          }
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
        description="핵심 정보만 먼저 입력하고, 필요한 정보만 상세 설정에서 이어서 추가하세요."
        onClose={() => setIsDialogOpen(false)}
        panelClassName="max-w-[58rem]"
        bodyClassName="px-4 py-4 sm:px-5 sm:py-5"
      >
        <form className="grid gap-4 sm:gap-5" onSubmit={handleSubmit}>
          {!editingPurchase ? (
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
                    rowId: multiRows[0]?.id ?? createMultiPurchaseRow().id,
                    column: "name",
                  };
                  setBulkInputError(null);
                  setMultiTableError(null);
                }}
              >
                여러 개 입력
              </SegmentedControlButton>
            </SegmentedControl>
          ) : null}

          {inputMode === "multi" && !editingPurchase ? (
            <div className="grid gap-4">
              <SegmentedControl>
                <SegmentedControlButton
                  active={multiEntryMode === "table"}
                  onClick={() => {
                    setMultiEntryMode("table");
                    pendingMultiFocusRef.current = {
                      rowId: multiRows[0]?.id ?? createMultiPurchaseRow().id,
                      column: "name",
                    };
                    setBulkInputError(null);
                    setMultiTableError(null);
                  }}
                >
                  표 입력
                </SegmentedControlButton>
                <SegmentedControlButton
                  active={multiEntryMode === "advanced"}
                  onClick={() => {
                    pendingMultiFocusRef.current = null;
                    setMultiEntryMode("advanced");
                    setMultiTableError(null);
                    setMultiRowErrors({});
                  }}
                >
                  고급 입력
                </SegmentedControlButton>
              </SegmentedControl>

              {multiEntryMode === "table" ? (
                <div className="planner-panel-muted p-3.5 sm:p-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      여러 개 입력
                    </p>
                    <p className="text-[13px] leading-6 text-[var(--text-label)]">
                      표처럼 바로 입력하고, `Tab`으로 다음 칸 이동, `Enter`로
                      같은 열의 다음 행으로 계속 입력할 수 있어요.
                    </p>
                  </div>

                  <datalist id="purchase-name-suggestions">
                    {purchaseNameSuggestions.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>

                  <div className="mt-3 md:overflow-visible">
                    <TableContainer className="entry-grid-shell">
                      <table className="data-table entry-grid-table">
                        <colgroup>
                          <col style={{ width: "34%" }} />
                          <col style={{ width: "16%" }} />
                          <col style={{ width: "17%" }} />
                          <col style={{ width: "21%" }} />
                          <col style={{ width: "12%" }} />
                        </colgroup>
                        <thead>
                          <tr>
                            <th className="table-col-left">품목명</th>
                            <th className="table-col-left">공간</th>
                            <th className="table-col-left">유형</th>
                            <th className="table-col-right">가격</th>
                            <th className="table-col-center">수량</th>
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
                                      list="purchase-name-suggestions"
                                      placeholder="예: 냉장고"
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
                                      ref={registerMultiCellRef(row.id, "room")}
                                      className={
                                        rowErrors?.room
                                          ? "entry-grid-control entry-grid-select w-full border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[color-mix(in_srgb,var(--danger)_12%,white)]"
                                          : "entry-grid-control entry-grid-select w-full"
                                      }
                                      value={row.room}
                                      onChange={(event) =>
                                        updateMultiRow(row.id, "room", event.target.value)
                                      }
                                      onKeyDown={(event) =>
                                        handleMultiCellKeyDown(event, rowIndex, "room")
                                      }
                                    >
                                      <option value="">선택</option>
                                      {multiPurchaseRoomOptions.map((room) => (
                                        <option key={room} value={room}>
                                          {room}
                                        </option>
                                      ))}
                                    </SelectInput>
                                  </td>
                                  <td className="table-col-left">
                                    <SelectInput
                                      ref={registerMultiCellRef(row.id, "category")}
                                      className={
                                        rowErrors?.category
                                          ? "entry-grid-control entry-grid-select w-full border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[color-mix(in_srgb,var(--danger)_12%,white)]"
                                          : "entry-grid-control entry-grid-select w-full"
                                      }
                                      value={row.category}
                                      onChange={(event) =>
                                        updateMultiRow(
                                          row.id,
                                          "category",
                                          event.target.value,
                                        )
                                      }
                                      onKeyDown={(event) =>
                                        handleMultiCellKeyDown(event, rowIndex, "category")
                                      }
                                    >
                                      <option value="">선택</option>
                                      {PURCHASE_CATEGORY_OPTIONS.map((category) => (
                                        <option key={category} value={category}>
                                          {category}
                                        </option>
                                      ))}
                                    </SelectInput>
                                  </td>
                                  <td className="table-col-right">
                                    <MoneyInput
                                      ref={registerMultiCellRef(row.id, "unitPrice")}
                                      className={
                                        rowErrors?.unitPrice
                                          ? "entry-grid-control w-full border-[var(--danger)] text-right focus:border-[var(--danger)] focus:ring-[color-mix(in_srgb,var(--danger)_12%,white)]"
                                          : "entry-grid-control w-full text-right"
                                      }
                                      placeholder="0"
                                      value={row.unitPrice}
                                      onValueChange={(value) =>
                                        updateMultiRow(
                                          row.id,
                                          "unitPrice",
                                          value,
                                        )
                                      }
                                      onKeyDown={(event) =>
                                        handleMultiCellKeyDown(
                                          event,
                                          rowIndex,
                                          "unitPrice",
                                        )
                                      }
                                    />
                                  </td>
                                  <td className="table-col-center">
                                    <TextInput
                                      ref={registerMultiCellRef(row.id, "quantity")}
                                      className={
                                        rowErrors?.quantity
                                          ? "entry-grid-control w-full border-[var(--danger)] text-center focus:border-[var(--danger)] focus:ring-[color-mix(in_srgb,var(--danger)_12%,white)]"
                                          : "entry-grid-control w-full text-center"
                                      }
                                      inputMode="numeric"
                                      min="1"
                                      placeholder="1"
                                      type="number"
                                      value={row.quantity}
                                      onChange={(event) =>
                                        updateMultiRow(
                                          row.id,
                                          "quantity",
                                          event.target.value,
                                        )
                                      }
                                      onKeyDown={(event) =>
                                        handleMultiCellKeyDown(
                                          event,
                                          rowIndex,
                                          "quantity",
                                        )
                                      }
                                    />
                                  </td>
                                </tr>
                                {rowErrorMessage ? (
                                  <tr className="entry-grid-error">
                                    <td
                                      colSpan={5}
                                      className="px-4 sm:px-5"
                                    >
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
                        마지막 행에서 `Enter`를 누르면 새 행이 자동으로 추가됩니다.
                      </p>
                      {multiTableError ? (
                        <p className="mt-2 text-sm leading-6 text-[var(--danger)]">
                          {multiTableError}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => appendMultiRow()}
                    >
                      + 행 추가
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="planner-panel-muted p-4 sm:p-5">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      고급 입력
                    </p>
                    <p className="text-[13px] leading-6 text-[var(--text-label)]">
                      기존 쉼표 형식을 그대로 붙여넣고 한 번에 추가할 수 있어요.
                    </p>
                  </div>

                  <div className="mt-4">
                    <Field label="여러 줄 입력">
                      <TextArea
                        className="min-h-[180px]"
                        placeholder={
                          "냉장고, 주방, 가전, 1200000, 1\n세탁기, 다용도실, 가전, 900000, 1\n식탁, 주방, 가구, 400000, 1"
                        }
                        value={bulkInputText}
                        onChange={(event) => {
                          setBulkInputText(event.target.value);
                          setBulkInputError(null);
                        }}
                      />
                    </Field>
                    <p className="mt-2 text-[12px] leading-5 text-[var(--text-muted)]">
                      빈 줄은 자동으로 무시하고, 가격에 구분 쉼표가 있어도 처리합니다.
                    </p>
                    {bulkInputError ? (
                      <p className="mt-3 text-sm leading-6 text-[var(--danger)]">
                        {bulkInputError}
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="planner-panel-muted p-4 sm:p-5">
                <div className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1.65fr)_minmax(10rem,0.9fr)]">
                    <Field label="품목명">
                      <TextInput
                        required
                        autoFocus
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

                    <Field label="금액">
                      <MoneyInput
                        required
                        value={form.unitPrice}
                        onValueChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            unitPrice: value,
                          }))
                        }
                      />
                    </Field>
                  </div>

                  <Field label="상태">
                    <SegmentedControl fullWidth className="grid-cols-3">
                      {PURCHASE_STATUS_OPTIONS.map((status) => {
                        return (
                          <SegmentedControlButton
                            active={form.status === status}
                            key={status}
                            className="h-11 w-full"
                            onClick={() =>
                              setForm((current) => ({
                                ...current,
                                status,
                              }))
                            }
                          >
                            {PURCHASE_STATUS_LABELS[status]}
                          </SegmentedControlButton>
                        );
                      })}
                    </SegmentedControl>
                  </Field>

                  <div className="flex flex-col gap-3 border-t border-[color-mix(in_srgb,var(--border)_76%,white)] pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <SummaryChip>
                        총액 {formatCurrency(draftAmounts.totalPrice)}
                      </SummaryChip>
                      {isInstallment ? (
                        <SummaryChip tone="highlight">
                          월 {formatCurrency(draftAmounts.monthlyPayment)} / {form.installmentMonths}개월
                        </SummaryChip>
                      ) : null}
                    </div>

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setIsDetailOpen((current) => !current)}
                    >
                      {isDetailOpen ? "상세 설정 접기" : "상세 설정"}
                    </Button>
                  </div>
                </div>
              </div>

              {isDetailOpen ? (
                <div className="planner-panel-blue p-4 sm:p-5">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      상세 설정
                    </p>
                    <p className="text-[13px] leading-6 text-[var(--text-label)]">
                      기본 구매 정보와 배송, 시공 정보를 필요한 만큼만 이어서 입력하세요.
                    </p>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
                        {detailRoomOptions.map((room) => (
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
                            paymentType:
                              event.target.value as PurchaseFormValues["paymentType"],
                          }))
                        }
                      >
                        <option value="lump">일시불</option>
                        <option value="installment">할부</option>
                      </SelectInput>
                    </Field>

                    {isInstallment ? (
                      <Field label="할부 개월">
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
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="planner-panel-muted flex items-center justify-between gap-3 p-3.5">
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          배송 정보
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          배송이 필요한 항목만 날짜 입력
                        </p>
                      </div>
                      <input
                        checked={form.deliveryRequired}
                        className="h-4 w-4 accent-[var(--primary)]"
                        type="checkbox"
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            deliveryRequired: event.target.checked,
                            deliveryDate: event.target.checked
                              ? current.deliveryDate
                              : "",
                          }))
                        }
                      />
                    </label>

                    <label className="planner-panel-muted flex items-center justify-between gap-3 p-3.5">
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          시공 정보
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          시공 일정과 비용이 필요한 항목만 입력
                        </p>
                      </div>
                      <input
                        checked={form.constructionRequired}
                        className="h-4 w-4 accent-[var(--primary)]"
                        type="checkbox"
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            constructionRequired: event.target.checked,
                            category: event.target.checked ? "시공" : current.category,
                            constructionDate: event.target.checked
                              ? current.constructionDate
                              : "",
                            constructionStartTime: event.target.checked
                              ? current.constructionStartTime
                              : "",
                            constructionCompany: event.target.checked
                              ? current.constructionCompany
                              : "",
                            constructionTotalCost: event.target.checked
                              ? current.constructionTotalCost
                              : "",
                            constructionDeposit: event.target.checked
                              ? current.constructionDeposit
                              : "",
                            constructionBalance: event.target.checked
                              ? current.constructionBalance
                              : "",
                          }))
                        }
                      />
                    </label>
                  </div>

                  {purchaseTimelineText ? (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <SummaryChip>{purchaseTimelineText}</SummaryChip>
                    </div>
                  ) : null}

                  {form.deliveryRequired ? (
                    <div className="planner-panel-muted mt-4 p-4">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          배송 정보
                        </p>
                        <p className="text-[13px] leading-6 text-[var(--text-label)]">
                          배송 날짜만 기록하면 배송 관리 화면과 바로 연결됩니다.
                        </p>
                      </div>

                      <div className="mt-4 max-w-[14rem]">
                        <Field label="배송일">
                          <TextInput
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
                    </div>
                  ) : null}

                  {form.constructionRequired ? (
                    <div className="planner-panel-muted mt-4 p-4">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          시공 정보
                        </p>
                        <p className="text-[13px] leading-6 text-[var(--text-label)]">
                          일정, 업체, 비용만 간단히 정리하면 이후 시공 관리와 바로 연결돼요.
                        </p>
                      </div>

                      <div className="mt-4 grid gap-4">
                        <div className="grid gap-4 sm:max-w-[14rem]">
                          <Field label="시공 상태">
                            <SelectInput
                              value={form.constructionStatus}
                              onChange={(event) =>
                                setForm((current) => ({
                                  ...current,
                                  constructionStatus:
                                    event.target.value as ConstructionStatus,
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

                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            📅 일정
                          </p>
                          <div className="mt-3 grid gap-4 sm:grid-cols-2">
                            <Field label="날짜">
                              <TextInput
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
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <SummaryChip>
                              총금액 {formatCurrency(draftConstructionTotalCost)}
                            </SummaryChip>
                            <SummaryChip>
                              계약금 {formatCurrency(draftConstructionDeposit)}
                            </SummaryChip>
                            <SummaryChip tone="highlight">
                              잔금 {formatCurrency(draftConstructionBalance)}
                            </SummaryChip>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-4">
                    <Field
                      label="링크"
                      hint="프로토콜 없이 입력하면 https://가 자동으로 붙어요."
                    >
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
                  </div>
                </div>
              ) : null}
            </>
          )}

          <DialogActions
            className="pt-1"
            onCancel={() => setIsDialogOpen(false)}
            submitLabel={
              editingPurchase
                ? "수정 저장"
                : inputMode === "multi"
                  ? "여러 항목 추가"
                  : "구매 항목 추가"
            }
          />
        </form>
      </FormDialog>
    </div>
  );
}
