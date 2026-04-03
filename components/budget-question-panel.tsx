"use client";

import { useState } from "react";

export type BudgetSetupResult = {
  budgetRange: "50만원 이하" | "50~100만원" | "100~200만원" | "200만원 이상";
  biggestExpense: "이사업체" | "청소 / 설치" | "가구 / 가전" | "기타";
  focusArea:
    | "전체 예산 정리"
    | "업체 비용 비교"
    | "추가 지출 체크"
    | "입주 후 구매 비용";
};

type BudgetQuestionPanelProps = {
  onClose: () => void;
  onComplete: (result: BudgetSetupResult) => void;
};

const budgetOptions: BudgetSetupResult["budgetRange"][] = [
  "50만원 이하",
  "50~100만원",
  "100~200만원",
  "200만원 이상",
];

const expenseOptions: BudgetSetupResult["biggestExpense"][] = [
  "이사업체",
  "청소 / 설치",
  "가구 / 가전",
  "기타",
];

const focusOptions: BudgetSetupResult["focusArea"][] = [
  "전체 예산 정리",
  "업체 비용 비교",
  "추가 지출 체크",
  "입주 후 구매 비용",
];

export default function BudgetQuestionPanel({
  onClose,
  onComplete,
}: BudgetQuestionPanelProps) {
  const [step, setStep] = useState(0);
  const [budgetRange, setBudgetRange] =
    useState<BudgetSetupResult["budgetRange"] | null>(null);
  const [biggestExpense, setBiggestExpense] =
    useState<BudgetSetupResult["biggestExpense"] | null>(null);
  const [focusArea, setFocusArea] =
    useState<BudgetSetupResult["focusArea"] | null>(null);

  const isNextDisabled =
    (step === 0 && !budgetRange) ||
    (step === 1 && !biggestExpense) ||
    (step === 2 && !focusArea);

  const completeSetup = () => {
    if (!budgetRange || !biggestExpense || !focusArea) {
      return;
    }

    onComplete({
      budgetRange,
      biggestExpense,
      focusArea,
    });
  };

  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-stone-200">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">
            Budget Setup
          </p>
          <h3 className="mt-2 text-2xl font-semibold">
            몇 가지 질문으로 기본 예산을 정리해요
          </h3>
          <p className="mt-2 text-sm leading-7 text-stone-600">
            질문에 답하면 지금 필요한 예산 요약 블록을 먼저 보여줍니다.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold transition hover:border-stone-500"
        >
          닫기
        </button>
      </div>

      <div className="mt-6 rounded-[1.75rem] bg-stone-50 p-5 ring-1 ring-stone-200">
        <p className="text-sm font-medium text-stone-500">질문 {step + 1} / 3</p>

        {step === 0 ? (
          <div className="mt-3">
            <h4 className="text-xl font-semibold">
              전체 이사 예산은 어느 정도로 생각하고 있나요?
            </h4>
            <p className="mt-2 text-sm leading-7 text-stone-600">
              전체 예산 구간을 선택하면 요약 블록에 먼저 반영됩니다.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {budgetOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setBudgetRange(option)}
                  className={`rounded-[1.5rem] border px-4 py-4 text-left text-base font-semibold transition ${
                    budgetRange === option
                      ? "border-teal-600 bg-teal-50"
                      : "border-stone-200 bg-white hover:border-teal-500 hover:bg-teal-50"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="mt-3">
            <h4 className="text-xl font-semibold">
              가장 큰 지출이 예상되는 항목은 무엇인가요?
            </h4>
            <p className="mt-2 text-sm leading-7 text-stone-600">
              가장 부담이 큰 항목을 먼저 정리해 보여드립니다.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {expenseOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setBiggestExpense(option)}
                  className={`rounded-[1.5rem] border px-4 py-4 text-left text-base font-semibold transition ${
                    biggestExpense === option
                      ? "border-teal-600 bg-teal-50"
                      : "border-stone-200 bg-white hover:border-teal-500 hover:bg-teal-50"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-3">
            <h4 className="text-xl font-semibold">
              예산 관리가 가장 필요한 영역은 무엇인가요?
            </h4>
            <p className="mt-2 text-sm leading-7 text-stone-600">
              선택한 영역과 관련된 주의 포인트를 위쪽에 먼저 보여드립니다.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {focusOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFocusArea(option)}
                  className={`rounded-[1.5rem] border px-4 py-4 text-left text-base font-semibold transition ${
                    focusArea === option
                      ? "border-teal-600 bg-teal-50"
                      : "border-stone-200 bg-white hover:border-teal-500 hover:bg-teal-50"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((currentStep) => currentStep - 1)}
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold transition hover:border-stone-500"
            >
              이전 질문
            </button>
          ) : null}

          {step < 2 ? (
            <button
              type="button"
              onClick={() => setStep((currentStep) => currentStep + 1)}
              disabled={isNextDisabled}
              className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              다음 질문
            </button>
          ) : (
            <button
              type="button"
              onClick={completeSetup}
              disabled={isNextDisabled}
              className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              예산 보기
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
