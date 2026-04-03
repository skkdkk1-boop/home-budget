export type HomeScheduleSummary = {
  weekTitle: string;
  reservationTitle: string;
  importantItems: string[];
};

export function buildHomeScheduleSummary(): HomeScheduleSummary {
  return {
    weekTitle: "이번 주 해야 할 일 정리",
    reservationTitle: "예약 / 신청 일정 확인",
    importantItems: [
      "전입신고 준비",
      "인터넷 이전 신청",
      "이사업체 일정 확인",
    ],
  };
}
