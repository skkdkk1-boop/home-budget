"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import type { Fund, FundFormValues } from "@/lib/planner-types";
import { compareRecent, formatCurrency, formatDate } from "@/lib/planner-utils";

import { usePlannerData } from "./planner-provider";
import {
  Button,
  DialogActions,
  EmptyState,
  Field,
  FormDialog,
  LoadingState,
  RowActionMenu,
  SelectInput,
  SectionHeader,
  StatusBadge,
  SummaryCard,
  SurfaceCard,
  TableContainer,
  TextInput,
  ValuePreviewPanel,
} from "./ui";

const emptyFundForm: FundFormValues = {
  name: "",
  amount: 0,
  isUsable: true,
};

export function FundsSection() {
  const { data, isReady, summary, addFund, updateFund, deleteFund } =
    usePlannerData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFund, setEditingFund] = useState<Fund | null>(null);
  const [form, setForm] = useState<FundFormValues>(emptyFundForm);

  useEffect(() => {
    if (!isDialogOpen) {
      setEditingFund(null);
      setForm(emptyFundForm);
      return;
    }

    if (editingFund) {
      setForm({
        name: editingFund.name,
        amount: editingFund.amount,
        isUsable: editingFund.isUsable,
      });
      return;
    }

    setForm(emptyFundForm);
  }, [editingFund, isDialogOpen]);

  const sortedFunds = [...data.funds].sort((a, b) => {
    return b.amount - a.amount || compareRecent(a, b);
  });

  const startCreate = () => {
    setEditingFund(null);
    setIsDialogOpen(true);
  };

  const startEdit = (fund: Fund) => {
    setEditingFund(fund);
    setIsDialogOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (editingFund) {
      updateFund(editingFund.id, form);
    } else {
      addFund(form);
    }

    setIsDialogOpen(false);
  };

  const requestDelete = (fund: Fund) => {
    if (window.confirm(`"${fund.name}" 자금을 삭제할까요?`)) {
      deleteFund(fund.id);
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
      <div className="grid gap-3 md:grid-cols-3">
        <SummaryCard
          label="등록 자금 수"
          value={`${data.funds.length}개`}
        />
        <SummaryCard
          label="총 자금"
          value={formatCurrency(summary.totalFunds)}
        />
        <SummaryCard
          label="사용 가능 자금"
          value={formatCurrency(summary.usableFunds)}
          tone="highlight"
        />
      </div>

      <SurfaceCard>
        <SectionHeader action={<Button onClick={startCreate}>자금 추가</Button>} />

        <div className="mt-4">
          {sortedFunds.length === 0 ? (
            <EmptyState
              title="등록된 자금이 없어요"
              description="첫 자금을 추가하면 대시보드와 구매 계산이 바로 연결됩니다."
            />
          ) : (
            <>
              <div className="hidden md:block">
                <TableContainer>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="table-col-left">자금 이름</th>
                        <th className="table-col-amount">금액</th>
                        <th className="table-col-status">사용 여부</th>
                        <th className="table-col-date">최근 수정</th>
                        <th className="table-col-actions">
                          <span className="sr-only">행 동작</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedFunds.map((fund) => (
                        <tr key={fund.id}>
                          <td className="table-col-left">
                            <p className="table-cell-title">{fund.name}</p>
                          </td>
                          <td className="table-col-amount numeric-value text-base font-semibold text-[var(--text-primary)]">
                            {formatCurrency(fund.amount)}
                          </td>
                          <td className="table-col-status">
                            <StatusBadge
                              tone={fund.isUsable ? "success" : "neutral"}
                            >
                              {fund.isUsable ? "사용 가능" : "참고용"}
                            </StatusBadge>
                          </td>
                          <td className="table-col-date text-[var(--text-secondary)]">
                            {formatDate(fund.updatedAt.slice(0, 10))}
                          </td>
                          <td className="table-col-actions">
                            <div className="table-action-slot">
                              <RowActionMenu
                                description={
                                  fund.isUsable ? "사용 가능 자금" : "참고용 자금"
                                }
                                label={fund.name}
                                mode="desktop"
                                onDelete={() => requestDelete(fund)}
                                onEdit={() => startEdit(fund)}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableContainer>
              </div>

              <div className="grid gap-3 md:hidden">
                {sortedFunds.map((fund) => (
                  <article
                    key={fund.id}
                    className="planner-mobile-card relative p-4 sm:p-5"
                  >
                    <div className="pr-12">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="table-cell-title text-base">
                            {fund.name}
                          </p>
                          <p className="numeric-value mt-2 text-[1.625rem] font-semibold tracking-[-0.04em] text-[var(--text-primary)] sm:text-[1.75rem]">
                            {formatCurrency(fund.amount)}
                          </p>
                        </div>
                        <StatusBadge tone={fund.isUsable ? "success" : "neutral"}>
                          {fund.isUsable ? "사용 가능" : "참고용"}
                        </StatusBadge>
                      </div>

                      <p className="mt-3 text-sm text-[var(--text-secondary)]">
                        최근 수정 {formatDate(fund.updatedAt.slice(0, 10))}
                      </p>
                    </div>

                    <RowActionMenu
                      description={
                        fund.isUsable ? "사용 가능 자금" : "참고용 자금"
                      }
                      label={fund.name}
                      mode="mobile"
                      onDelete={() => requestDelete(fund)}
                      onEdit={() => startEdit(fund)}
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
        title={editingFund ? "자금 수정" : "자금 추가"}
        description="이름과 금액, 사용 가능 여부만 입력하면 바로 반영됩니다."
        onClose={() => setIsDialogOpen(false)}
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="자금 이름">
              <TextInput
                required
                placeholder="예: 비상금 통장"
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
              <TextInput
                required
                inputMode="numeric"
                min="0"
                step="1000"
                type="number"
                value={form.amount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    amount: Number(event.target.value),
                  }))
                }
              />
            </Field>
          </div>

          <Field label="사용 가능 여부">
            <SelectInput
              value={form.isUsable ? "true" : "false"}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isUsable: event.target.value === "true",
                }))
              }
            >
              <option value="true">사용 가능 자금</option>
              <option value="false">참고용 자금</option>
            </SelectInput>
          </Field>

          <ValuePreviewPanel
            caption={
              form.isUsable
                ? "실제 남은 자금 계산에 포함돼요."
                : "총 자금에는 포함되지만 사용 가능 자금에는 제외돼요."
            }
            label="미리보기"
            value={formatCurrency(form.amount)}
          />

          <DialogActions
            onCancel={() => setIsDialogOpen(false)}
            submitLabel={editingFund ? "수정 저장" : "자금 추가"}
          />
        </form>
      </FormDialog>
    </div>
  );
}
