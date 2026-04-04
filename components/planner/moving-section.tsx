"use client";

import { useMemo, useState } from "react";

import { shiftDate, todayKey } from "@/lib/planner-utils";

import { MovingDisposalSection } from "./moving-disposal-section";
import { usePlannerData } from "./planner-provider";
import { MovingSalesSection } from "./moving-sales-section";
import { MovingTransferSection } from "./moving-transfer-section";
import {
  LoadingState,
  SegmentedControl,
  SegmentedControlButton,
  SummaryCard,
  SurfaceCard,
} from "./ui";

type MovingTabId = "sell" | "dispose" | "move";

const movingTabs: Array<{
  id: MovingTabId;
  label: string;
}> = [
  {
    id: "sell",
    label: "판매",
  },
  {
    id: "dispose",
    label: "폐기",
  },
  {
    id: "move",
    label: "정리/이동",
  },
];

export function MovingSection() {
  const { data, isReady } = usePlannerData();
  const [activeTab, setActiveTab] = useState<MovingTabId>("sell");
  const movingSummaryCards = useMemo(() => {
    const today = todayKey();
    const urgentLimit = shiftDate(3);
    const activeSellCount = data.sellItems.filter((item) => item.status !== "completed").length;
    const activeDisposalCount = data.disposalItems.filter(
      (item) => item.status !== "completed",
    ).length;
    const activeMoveCount = data.moveItems.filter((item) => item.status !== "completed").length;
    const urgentCount = [
      ...data.sellItems
        .filter((item) => item.status !== "completed")
        .map((item) => item.sellByDate),
      ...data.disposalItems
        .filter((item) => item.status !== "completed")
        .map((item) => item.disposalDate),
    ].filter((date) => {
      return (
        Boolean(date) &&
        date >= today &&
        date <= urgentLimit
      );
    }).length;

    return [
      { label: "판매 예정", value: `${activeSellCount}건` },
      { label: "폐기 예정", value: `${activeDisposalCount}건` },
      { label: "이동 예정", value: `${activeMoveCount}건` },
      { label: "마감 임박", value: `${urgentCount}건`, tone: "highlight" as const },
    ];
  }, [data.disposalItems, data.moveItems, data.sellItems]);

  if (!isReady) {
    return (
      <div className="page-shell">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="page-shell relative z-0">
      <div className="relative z-0 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {movingSummaryCards.map((card) => (
          <SummaryCard
            key={card.label}
            label={card.label}
            priority="secondary"
            tone={card.tone ?? "default"}
            value={card.value}
          />
        ))}
      </div>

      <SurfaceCard className="relative z-0">
        <div className="flex flex-col gap-4">
          <SegmentedControl fullWidth className="grid-cols-3 sm:inline-flex sm:w-auto">
            {movingTabs.map((tab) => (
              <SegmentedControlButton
                key={tab.id}
                active={activeTab === tab.id}
                className="h-10 w-full sm:w-auto"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </SegmentedControlButton>
            ))}
          </SegmentedControl>

          {activeTab === "sell" ? (
            <MovingSalesSection />
          ) : activeTab === "dispose" ? (
            <MovingDisposalSection />
          ) : (
            <MovingTransferSection />
          )}
        </div>
      </SurfaceCard>
    </div>
  );
}
