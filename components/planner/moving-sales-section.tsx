"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";

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
} from "@/lib/planner-utils";

import { usePlannerData } from "./planner-provider";
import {
  Button,
  DetailRow,
  DialogActions,
  EmptyState,
  Field,
  FormDialog,
  LoadingState,
  RowActionMenu,
  SectionHeader,
  SelectInput,
  StatusBadge,
  TableContainer,
  TextArea,
  TextInput,
} from "./ui";

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

export function MovingSalesSection() {
  const { data, isReady, addSellItem, updateSellItem, deleteSellItem } =
    usePlannerData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SellItem | null>(null);
  const [locationFilter, setLocationFilter] = useState<SellLocation | "all">("all");
  const [statusFilter, setStatusFilter] = useState<SellItemStatus | "all">("all");
  const [sortBy, setSortBy] = useState<SellItemSortOption>("recent");
  const [form, setForm] = useState<SellItemFormValues>(createEmptySellItemForm);

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

  const startCreate = () => {
    setEditingItem(null);
    setForm(createEmptySellItemForm());
    setIsDialogOpen(true);
  };

  const startEdit = (item: SellItem) => {
    setEditingItem(item);
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

    if (editingItem) {
      updateSellItem(editingItem.id, form);
    } else {
      addSellItem(form);
    }

    setIsDialogOpen(false);
  };

  const requestDelete = (item: SellItem) => {
    if (window.confirm(`"${item.name}" 판매 항목을 삭제할까요?`)) {
      deleteSellItem(item.id);
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
                  <div className="pr-12">
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
        onClose={() => setIsDialogOpen(false)}
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
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

          <DialogActions
            onCancel={() => setIsDialogOpen(false)}
            submitLabel={editingItem ? "수정 저장" : "판매 항목 추가"}
          />
        </form>
      </FormDialog>
    </>
  );
}
