import type { ChecklistSetupResult } from "@/components/checklist-question-panel";

export type ChecklistItem = {
  id: string;
  label: string;
  completed: boolean;
};

export type ChecklistGroup = {
  title: "이사 전" | "이사 당일" | "이사 후";
  items: ChecklistItem[];
};

const groupItems: Record<ChecklistGroup["title"], string[]> = {
  "이사 전": [
    "전입신고 준비",
    "인터넷 이전 신청",
    "이사업체 최종 확인",
  ],
  "이사 당일": [
    "냉장고 비우기",
    "짐 반출 동선 확인",
    "열쇠 및 출입 안내 준비",
  ],
  "이사 후": [
    "입주청소 확인",
    "가전 위치 정리",
    "주소 변경 마무리",
  ],
};

export function buildChecklistGroups(
  result: ChecklistSetupResult | null,
): ChecklistGroup[] {
  if (!result) {
    return [];
  }

  const groupsByStage: Record<ChecklistSetupResult["currentStage"], ChecklistGroup["title"][]> =
    {
      "이사 전": ["이사 전", "이사 당일"],
      "이사 당일 준비 중": ["이사 전", "이사 당일", "이사 후"],
      "이사 후 정리 중": ["이사 당일", "이사 후"],
    };

  const helpAreaItemMap: Record<ChecklistSetupResult["helpArea"], string> = {
    "계약/행정": "계약서와 행정 서류 다시 확인하기",
    "업체/예약": "예약 일정과 연락처 다시 확인하기",
    "짐 정리": "버릴 짐과 가져갈 짐 먼저 나누기",
    "입주 후 정리": "생활 우선 공간부터 정리 순서 정하기",
  };

  return groupsByStage[result.currentStage].map((groupTitle) => {
    const labels = [helpAreaItemMap[result.helpArea], ...groupItems[groupTitle]];

    return {
      title: groupTitle,
      items: labels.map((label, index) => ({
        id: `${groupTitle}-${index}`,
        label,
        completed: false,
      })),
    };
  });
}

export function getChecklistProgress(groups: ChecklistGroup[]) {
  const totalCount = groups.reduce((count, group) => count + group.items.length, 0);
  const completedCount = groups.reduce(
    (count, group) =>
      count + group.items.filter((item) => item.completed).length,
    0,
  );
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return {
    totalCount,
    completedCount,
    progressPercent,
  };
}

export function getRemainingChecklistItems(
  groups: ChecklistGroup[],
  limit = 3,
) {
  return groups
    .flatMap((group) => group.items)
    .filter((item) => !item.completed)
    .slice(0, limit);
}

export function buildHomeChecklistSummary() {
  const sampleResult: ChecklistSetupResult = {
    moveDate: "2026-04-15",
    currentStage: "이사 전",
    helpArea: "업체/예약",
  };

  const groups = buildChecklistGroups(sampleResult).map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      completed:
        item.label === "예약 일정과 연락처 다시 확인하기" ||
        item.label === "이사업체 최종 확인",
    })),
  }));

  return {
    groups,
    ...getChecklistProgress(groups),
    remainingItems: getRemainingChecklistItems(groups, 3),
  };
}
