"use client";

import { useState } from "react";

export type ScheduleSetupResult = {
  moveDate: string;
  currentStage: "이사 전" | "이사 직전" | "이사 후";
  focusArea: "행정 / 주소 변경" | "업체 예약 / 확인" | "짐 정리" | "입주 준비";
};

type ScheduleQuestionPanelProps = {
  onClose: () => void;
  onComplete: (result: ScheduleSetupResult) => void;
};

const stageOptions: ScheduleSetupResult["currentStage"][] = [
  "이사 전",
  "이사 직전",
  "이사 후",
];

const focusAreaOptions: ScheduleSetupResult["focusArea"][] = [
  "행정 / 주소 변경",
  "업체 예약 / 확인",
  "짐 정리",
  "입주 준비",
];

export default function ScheduleQuestionPanel({
  onClose,
  onComplete,
}: ScheduleQuestionPanelProps) {
  const [step, setStep] = useState(0);
  const [moveDate, setMoveDate] = useState("");
  const [currentStage, setCurrentStage] =
    useState<ScheduleSetupResult["currentStage"] | null>(null);
  const [focusArea, setFocusArea] =
    useState<ScheduleSetupResult["focusArea"] | null>(null);

  const isNextDisabled =
    (step === 0 && !moveDate) ||
    (step === 1 && !currentStage) ||
    (step === 2 && !focusArea);

  const completeSetup = () => {
    if (!moveDate || !currentStage || !focusArea) {
      return;
    }

    onComplete({
      moveDate,
      currentStage,
      focusArea,
    });
  };

  return (
    <section className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-stone-200">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">
            Schedule Setup
          </p>
          <h3 className="mt-2 text-2xl font-semibold">
            몇 가지 질문으로 기본 일정을 정리해요
          </h3>
          <p className="mt-2 text-sm leading-7 text-stone-600">
            질문에 답하면 지금 필요한 일정 블록을 먼저 보여줍니다.
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
            <h4 className="text-xl font-semibold">이사 날짜는 언제인가요?</h4>
            <p className="mt-2 text-sm leading-7 text-stone-600">
              날짜를 기준으로 어떤 일정을 먼저 보여줄지 정리합니다.
            </p>
            <input
              type="date"
              value={moveDate}
              onChange={(event) => setMoveDate(event.target.value)}
              className="mt-4 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none transition focus:border-teal-500"
            />
          </div>
        ) : null}

        {step === 1 ? (
          <div className="mt-3">
            <h4 className="text-xl font-semibold">현재 단계는 어디인가요?</h4>
            <p className="mt-2 text-sm leading-7 text-stone-600">
              지금 상황에 가장 가까운 단계를 골라 주세요.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {stageOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCurrentStage(option)}
                  className={`rounded-[1.5rem] border px-4 py-4 text-left text-base font-semibold transition ${
                    currentStage === option
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
              가장 먼저 챙기고 싶은 일정은 무엇인가요?
            </h4>
            <p className="mt-2 text-sm leading-7 text-stone-600">
              선택한 영역과 관련된 일정을 위쪽에 먼저 보여드립니다.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {focusAreaOptions.map((option) => (
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
              일정 보기
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
