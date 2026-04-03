"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import type {
  Construction,
  ConstructionFormValues,
  Room,
} from "@/lib/planner-types";
import {
  CONSTRUCTION_STATUS_LABELS,
  CONSTRUCTION_STATUS_OPTIONS,
  ROOM_OPTIONS,
} from "@/lib/planner-types";
import {
  formatCurrency,
  formatDate,
  sortConstructionsByDate,
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

const constructionToneMap = {
  before: "neutral",
  scheduled: "info",
  done: "success",
} as const;

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
  const { data, isReady, addConstruction, updateConstruction, deleteConstruction } =
    usePlannerData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConstruction, setEditingConstruction] =
    useState<Construction | null>(null);
  const [form, setForm] =
    useState<ConstructionFormValues>(createEmptyConstructionForm);

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

  const sortedConstructions = sortConstructionsByDate(data.constructions);
  const today = todayKey();
  const activeCount = data.constructions.filter(
    (item) => item.constructionStatus !== "done" && item.constructionDate >= today,
  ).length;
  const completedCount = data.constructions.filter(
    (item) => item.constructionStatus === "done",
  ).length;
  const totalCost = data.constructions.reduce((sum, item) => sum + item.cost, 0);
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
          label="전체 시공 항목"
          value={`${data.constructions.length}건`}
          description="진행 전부터 완료까지 한 번에 관리"
        />
        <SummaryCard
          label="예정 / 진행 중"
          value={`${activeCount}건`}
          description="아직 끝나지 않은 시공 일정"
          tone="highlight"
        />
        <SummaryCard
          label="완료 시공"
          value={`${completedCount}건`}
          description="이미 마친 작업"
        />
        <SummaryCard
          label="예정 시공 비용"
          value={formatCurrency(activeCost)}
          description={`전체 등록 비용 ${formatCurrency(totalCost)}`}
        />
      </div>

      <SurfaceCard>
        <SectionHeader
          title="시공 목록"
          description="시공일 순으로 정렬되어 예정된 공정을 빠르게 확인할 수 있어요."
          action={<Button onClick={startCreate}>시공 항목 추가</Button>}
        />

        <div className="mt-5">
          {sortedConstructions.length === 0 ? (
            <EmptyState
              title="등록된 시공이 없어요"
              description="도배, 조명, 선반 설치처럼 챙겨야 할 공정을 추가해보세요."
            />
          ) : (
            <>
              <div className="hidden lg:block">
                <div className="table-shell">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="table-col-status">상태</th>
                        <th className="table-col-left">시공명</th>
                        <th className="table-col-left">공간</th>
                        <th className="table-col-date">시공일</th>
                        <th className="table-col-amount">비용</th>
                        <th className="table-col-left">업체 / 연락처</th>
                        <th className="table-col-actions">관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedConstructions.map((construction) => (
                        <tr key={construction.id}>
                          <td className="table-col-status">
                            <StatusBadge
                              tone={constructionToneMap[construction.constructionStatus]}
                            >
                              {
                                CONSTRUCTION_STATUS_LABELS[
                                  construction.constructionStatus
                                ]
                              }
                            </StatusBadge>
                          </td>
                          <td className="table-col-left">
                            <p className="font-semibold text-[var(--text-primary)]">
                              {construction.name}
                            </p>
                            {construction.note ? (
                              <p className="mt-1 max-w-[260px] truncate text-[var(--text-secondary)]">
                                {construction.note}
                              </p>
                            ) : null}
                          </td>
                          <td className="table-col-left text-[var(--text-secondary)]">
                            {construction.room}
                          </td>
                          <td className="table-col-date text-[var(--text-primary)]">
                            {formatDate(construction.constructionDate)}
                          </td>
                          <td className="table-col-amount font-semibold text-[var(--text-primary)]">
                            {formatCurrency(construction.cost)}
                          </td>
                          <td className="table-col-left text-[var(--text-secondary)]">
                            <p>{construction.company || "-"}</p>
                            <p className="mt-1">{construction.contact || "-"}</p>
                          </td>
                          <td className="table-col-actions">
                            <div className="table-actions">
                              <Button
                                className="table-action-button"
                                size="sm"
                                variant="secondary"
                                onClick={() => startEdit(construction)}
                              >
                                수정
                              </Button>
                              <Button
                                className="table-action-button"
                                size="sm"
                                variant="danger"
                                onClick={() => requestDelete(construction)}
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
                {sortedConstructions.map((construction) => (
                  <article
                    key={construction.id}
                    className="planner-mobile-card p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge
                            tone={constructionToneMap[construction.constructionStatus]}
                          >
                            {
                              CONSTRUCTION_STATUS_LABELS[
                                construction.constructionStatus
                              ]
                            }
                          </StatusBadge>
                          <p className="text-base font-semibold text-[var(--text-primary)]">
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
                        value={formatCurrency(construction.cost)}
                      />
                      <DetailRow
                        label="연락처"
                        value={construction.contact || "-"}
                      />
                      <DetailRow label="메모" value={construction.note || "-"} />
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button
                        className="table-action-button flex-1"
                        size="sm"
                        variant="secondary"
                        onClick={() => startEdit(construction)}
                      >
                        수정
                      </Button>
                      <Button
                        className="table-action-button flex-1"
                        size="sm"
                        variant="danger"
                        onClick={() => requestDelete(construction)}
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

          <div className="planner-panel-muted p-4">
            <p className="text-sm text-[var(--text-secondary)]">예상 비용</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
              {formatCurrency(form.cost)}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button type="submit">
              {editingConstruction ? "수정 저장" : "시공 항목 추가"}
            </Button>
          </div>
        </form>
      </FormDialog>
    </div>
  );
}
