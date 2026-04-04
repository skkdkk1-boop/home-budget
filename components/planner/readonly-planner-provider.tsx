"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";

import type { PlannerData } from "@/lib/planner-types";
import { buildDashboardSummary } from "@/lib/planner-utils";

import {
  PlannerContext,
  type PlannerContextValue,
} from "./planner-provider";

const readonlyNoop = () => undefined;

export function ReadonlyPlannerProvider({
  children,
  data,
  routeBasePath,
}: {
  children: ReactNode;
  data: PlannerData;
  routeBasePath: string;
}) {
  const value = useMemo<PlannerContextValue>(
    () => ({
      data,
      isReady: true,
      isReadOnly: true,
      routeBasePath,
      summary: buildDashboardSummary(data),
      addFund: readonlyNoop,
      updateFund: readonlyNoop,
      deleteFund: readonlyNoop,
      addPurchase: readonlyNoop,
      addPurchases: readonlyNoop,
      updatePurchase: readonlyNoop,
      updatePurchaseStatuses: readonlyNoop,
      deletePurchase: readonlyNoop,
      deletePurchases: readonlyNoop,
      addSellItem: readonlyNoop,
      addSellItems: readonlyNoop,
      updateSellItem: readonlyNoop,
      updateSellItemStatuses: readonlyNoop,
      deleteSellItem: readonlyNoop,
      deleteSellItems: readonlyNoop,
      addDisposalItem: readonlyNoop,
      updateDisposalItem: readonlyNoop,
      deleteDisposalItem: readonlyNoop,
      deleteDisposalItems: readonlyNoop,
      addMoveItem: readonlyNoop,
      updateMoveItem: readonlyNoop,
      deleteMoveItem: readonlyNoop,
      deleteMoveItems: readonlyNoop,
    }),
    [data, routeBasePath],
  );

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}
