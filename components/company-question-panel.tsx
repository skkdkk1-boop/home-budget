"use client";

import { useState } from "react";

export type CompanyFormResult = {
  name: string;
  priceRange: "50 이하" | "50~100" | "100 이상";
  moveType: "포장이사" | "반포장" | "용달";
  hasVisitEstimate: "예" | "아니오";
};

type CompanyQuestionPanelProps = {
  onComplete: (result: CompanyFormResult) => void;
  onClose: () => void;
};

const priceOptions: CompanyFormResult["priceRange"][] = [
  "50 이하",
  "50~100",
  "100 이상",
];

const moveTypeOptions: CompanyFormResult["moveType"][] = [
  "포장이사",
  "반포장",
  "용달",
];

const visitEstimateOptions: CompanyFormResult["hasVisitEstimate"][] = [
  "예",
  "아니오",
];

export default function CompanyQuestionPanel({
  onComplete,
  onClose,
}: CompanyQuestionPanelProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [priceRange, setPriceRange] =
    useState<CompanyFormResult["priceRange"] | null>(null);
  const [moveType, setMoveType] =
    useState<CompanyFormResult["moveType"] | null>(null);
  const [hasVisitEstimate, setHasVisitEstimate] =
    useState<CompanyFormResult["hasVisitEstimate"] | null>(null);

  const goNext = () => {
    setStep((currentStep) => currentStep + 1);
  };

  const goBack = () => {
    setStep((currentStep) => currentStep - 1);
  };

  const submitResult = () => {
    if (!name || !priceRange || !moveType || !hasVisitEstimate) {
      return;
    }

    onComplete({
      name,
      priceRange,
      moveType,
      hasVisitEstimate,
    });
  };

  const isNextDisabled =
    (step === 0 && !name.trim()) ||
    (step === 1 && !priceRange) ||
    (step === 2 && !moveType) ||
    (step === 3 && !hasVisitEstimate);

  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-stone-200">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">
            Company Input
          </p>
          <h3 className="mt-2 text-2xl font-semibold">업체 정보를 질문으로 입력해요</h3>
          <p className="mt-2 text-sm leading-7 text-stone-600">
            한 번에 하나의 질문만 보여주고, 클릭 중심으로 답하도록 구성했습니다.
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
        <p className="text-sm font-medium text-stone-500">질문 {step + 1} / 4</p>

        {step === 0 ? (
          <div className="mt-3">
            <h4 className="text-xl font-semibold">업체명이 무엇인가요?</h4>
            <p className="mt-2 text-sm leading-7 text-stone-600">
              여기만 간단히 입력하고, 나머지는 선택형으로 진행합니다.
            </p>

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="예: 튼튼이사"
              className="mt-4 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none transition focus:border-teal-500"
            />
          </div>
        ) : null}

        {step === 1 ? (
          <div className="mt-3">
            <h4 className="text-xl font-semibold">가격대는 어느 쪽인가요?</h4>
            <p className="mt-2 text-sm leading-7 text-stone-600">
              정확한 금액 대신 구간을 선택하는 방식입니다.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {priceOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPriceRange(option)}
                  className={`rounded-[1.5rem] border px-4 py-4 text-left text-base font-semibold transition ${
                    priceRange === option
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
            <h4 className="text-xl font-semibold">이사 종류는 무엇인가요?</h4>
            <p className="mt-2 text-sm leading-7 text-stone-600">
              가장 가까운 유형을 하나 선택해 주세요.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {moveTypeOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMoveType(option)}
                  className={`rounded-[1.5rem] border px-4 py-4 text-left text-base font-semibold transition ${
                    moveType === option
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

        {step === 3 ? (
          <div className="mt-3">
            <h4 className="text-xl font-semibold">방문 견적을 받았나요?</h4>
            <p className="mt-2 text-sm leading-7 text-stone-600">
              마지막 질문입니다. 하나만 선택하면 입력이 끝납니다.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {visitEstimateOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setHasVisitEstimate(option)}
                  className={`rounded-[1.5rem] border px-4 py-4 text-left text-base font-semibold transition ${
                    hasVisitEstimate === option
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
              onClick={goBack}
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold transition hover:border-stone-500"
            >
              이전 질문
            </button>
          ) : null}

          {step < 3 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={isNextDisabled}
              className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              다음 질문
            </button>
          ) : (
            <button
              type="button"
              onClick={submitResult}
              disabled={isNextDisabled}
              className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              입력 완료
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
