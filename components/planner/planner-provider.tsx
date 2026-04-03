"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";

import { buildSamplePlannerData } from "@/lib/planner-sample-data";
import type {
  ConstructionFormValues,
  FundFormValues,
  PlannerData,
  PurchaseFormValues,
  ShippingFormValues,
} from "@/lib/planner-types";
import {
  EMPTY_PLANNER_DATA,
  buildDashboardSummary,
  calculatePurchaseAmounts,
  createId,
  normalizeAmount,
  normalizeLink,
  parseStoredPlannerData,
  STORAGE_KEY,
} from "@/lib/planner-utils";

interface PlannerContextValue {
  data: PlannerData;
  isReady: boolean;
  summary: ReturnType<typeof buildDashboardSummary>;
  addFund: (input: FundFormValues) => void;
  updateFund: (id: string, input: FundFormValues) => void;
  deleteFund: (id: string) => void;
  addPurchase: (input: PurchaseFormValues) => void;
  updatePurchase: (id: string, input: PurchaseFormValues) => void;
  deletePurchase: (id: string) => void;
  addShipping: (input: ShippingFormValues) => void;
  updateShipping: (id: string, input: ShippingFormValues) => void;
  deleteShipping: (id: string) => void;
  addConstruction: (input: ConstructionFormValues) => void;
  updateConstruction: (id: string, input: ConstructionFormValues) => void;
  deleteConstruction: (id: string) => void;
}

const PlannerContext = createContext<PlannerContextValue | null>(null);

function normalizeFundInput(input: FundFormValues) {
  return {
    name: input.name.trim() || "이름 없는 자금",
    amount: normalizeAmount(input.amount, 0),
    isUsable: input.isUsable,
  };
}

function normalizePurchaseInput(input: PurchaseFormValues) {
  return {
    status: input.status,
    room: input.room,
    category: input.category,
    name: input.name.trim() || "이름 없는 품목",
    unitPrice: normalizeAmount(input.unitPrice, 0),
    quantity: normalizeAmount(input.quantity, 1),
    paymentType: input.paymentType,
    installmentMonths: normalizeAmount(input.installmentMonths, 1),
    link: normalizeLink(input.link),
    note: input.note.trim(),
  };
}

function normalizeShippingInput(input: ShippingFormValues) {
  return {
    itemName: input.itemName.trim() || "이름 없는 배송",
    room: input.room,
    shippingStatus: input.shippingStatus,
    expectedDate: input.expectedDate,
    note: input.note.trim(),
  };
}

function normalizeConstructionInput(input: ConstructionFormValues) {
  return {
    name: input.name.trim() || "이름 없는 시공",
    room: input.room,
    constructionStatus: input.constructionStatus,
    constructionDate: input.constructionDate,
    cost: normalizeAmount(input.cost, 0),
    company: input.company.trim(),
    contact: input.contact.trim(),
    note: input.note.trim(),
  };
}

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PlannerData>(EMPTY_PLANNER_DATA);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? parseStoredPlannerData(raw) : null;

    setData(parsed ?? buildSamplePlannerData());
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, isReady]);

  const summary = buildDashboardSummary(data);

  const addFund = (input: FundFormValues) => {
    const now = new Date().toISOString();
    const nextFund = {
      id: createId("fund"),
      ...normalizeFundInput(input),
      createdAt: now,
      updatedAt: now,
    };

    setData((current) => ({
      ...current,
      funds: [nextFund, ...current.funds],
    }));
  };

  const updateFund = (id: string, input: FundFormValues) => {
    const now = new Date().toISOString();
    const normalized = normalizeFundInput(input);

    setData((current) => ({
      ...current,
      funds: current.funds.map((item) => {
        return item.id === id ? { ...item, ...normalized, updatedAt: now } : item;
      }),
    }));
  };

  const deleteFund = (id: string) => {
    setData((current) => ({
      ...current,
      funds: current.funds.filter((item) => item.id !== id),
    }));
  };

  const addPurchase = (input: PurchaseFormValues) => {
    const now = new Date().toISOString();
    const normalized = normalizePurchaseInput(input);
    const calculated = calculatePurchaseAmounts(normalized);
    const nextPurchase = {
      id: createId("purchase"),
      ...normalized,
      ...calculated,
      createdAt: now,
      updatedAt: now,
    };

    setData((current) => ({
      ...current,
      purchases: [nextPurchase, ...current.purchases],
    }));
  };

  const updatePurchase = (id: string, input: PurchaseFormValues) => {
    const now = new Date().toISOString();
    const normalized = normalizePurchaseInput(input);
    const calculated = calculatePurchaseAmounts(normalized);

    setData((current) => ({
      ...current,
      purchases: current.purchases.map((item) => {
        return item.id === id
          ? { ...item, ...normalized, ...calculated, updatedAt: now }
          : item;
      }),
    }));
  };

  const deletePurchase = (id: string) => {
    setData((current) => ({
      ...current,
      purchases: current.purchases.filter((item) => item.id !== id),
    }));
  };

  const addShipping = (input: ShippingFormValues) => {
    const now = new Date().toISOString();
    const nextShipping = {
      id: createId("shipping"),
      ...normalizeShippingInput(input),
      createdAt: now,
      updatedAt: now,
    };

    setData((current) => ({
      ...current,
      shippings: [nextShipping, ...current.shippings],
    }));
  };

  const updateShipping = (id: string, input: ShippingFormValues) => {
    const now = new Date().toISOString();
    const normalized = normalizeShippingInput(input);

    setData((current) => ({
      ...current,
      shippings: current.shippings.map((item) => {
        return item.id === id ? { ...item, ...normalized, updatedAt: now } : item;
      }),
    }));
  };

  const deleteShipping = (id: string) => {
    setData((current) => ({
      ...current,
      shippings: current.shippings.filter((item) => item.id !== id),
    }));
  };

  const addConstruction = (input: ConstructionFormValues) => {
    const now = new Date().toISOString();
    const nextConstruction = {
      id: createId("construction"),
      ...normalizeConstructionInput(input),
      createdAt: now,
      updatedAt: now,
    };

    setData((current) => ({
      ...current,
      constructions: [nextConstruction, ...current.constructions],
    }));
  };

  const updateConstruction = (id: string, input: ConstructionFormValues) => {
    const now = new Date().toISOString();
    const normalized = normalizeConstructionInput(input);

    setData((current) => ({
      ...current,
      constructions: current.constructions.map((item) => {
        return item.id === id ? { ...item, ...normalized, updatedAt: now } : item;
      }),
    }));
  };

  const deleteConstruction = (id: string) => {
    setData((current) => ({
      ...current,
      constructions: current.constructions.filter((item) => item.id !== id),
    }));
  };

  return (
    <PlannerContext.Provider
      value={{
        data,
        isReady,
        summary,
        addFund,
        updateFund,
        deleteFund,
        addPurchase,
        updatePurchase,
        deletePurchase,
        addShipping,
        updateShipping,
        deleteShipping,
        addConstruction,
        updateConstruction,
        deleteConstruction,
      }}
    >
      {children}
    </PlannerContext.Provider>
  );
}

export function usePlannerData() {
  const context = useContext(PlannerContext);

  if (!context) {
    throw new Error("usePlannerData must be used within PlannerProvider");
  }

  return context;
}
