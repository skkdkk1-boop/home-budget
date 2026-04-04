"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { buildSamplePlannerData } from "@/lib/planner-sample-data";
import type {
  DisposalItemFormValues,
  FundFormValues,
  MoveItemFormValues,
  PlannerData,
  PurchaseStatus,
  PurchaseFormValues,
  SellItemStatus,
  SellItemFormValues,
} from "@/lib/planner-types";
import {
  isMissingPlannerDocumentsTableError,
  loadPlannerDataForUser,
  savePlannerDataForUser,
} from "@/lib/planner-supabase";
import {
  EMPTY_PLANNER_DATA,
  buildDashboardSummary,
  calculatePurchaseAmounts,
  createId,
  getPlannerStorageConfig,
  hasPlannerDataContent,
  LEGACY_STORAGE_KEY,
  normalizeAmount,
  normalizeLink,
  parseStoredPlannerData,
} from "@/lib/planner-utils";
import { usePlannerAuth } from "./auth-provider";

interface PlannerContextValue {
  data: PlannerData;
  isReady: boolean;
  summary: ReturnType<typeof buildDashboardSummary>;
  addFund: (input: FundFormValues) => void;
  updateFund: (id: string, input: FundFormValues) => void;
  deleteFund: (id: string) => void;
  addPurchase: (input: PurchaseFormValues) => void;
  addPurchases: (inputs: PurchaseFormValues[]) => void;
  updatePurchase: (id: string, input: PurchaseFormValues) => void;
  updatePurchaseStatuses: (ids: string[], status: PurchaseStatus) => void;
  deletePurchase: (id: string) => void;
  deletePurchases: (ids: string[]) => void;
  addSellItem: (input: SellItemFormValues) => void;
  addSellItems: (inputs: SellItemFormValues[]) => void;
  updateSellItem: (id: string, input: SellItemFormValues) => void;
  updateSellItemStatuses: (ids: string[], status: SellItemStatus) => void;
  deleteSellItem: (id: string) => void;
  deleteSellItems: (ids: string[]) => void;
  addDisposalItem: (input: DisposalItemFormValues) => void;
  updateDisposalItem: (id: string, input: DisposalItemFormValues) => void;
  deleteDisposalItem: (id: string) => void;
  deleteDisposalItems: (ids: string[]) => void;
  addMoveItem: (input: MoveItemFormValues) => void;
  updateMoveItem: (id: string, input: MoveItemFormValues) => void;
  deleteMoveItem: (id: string) => void;
  deleteMoveItems: (ids: string[]) => void;
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
  const constructionTotalCost = normalizeAmount(input.constructionTotalCost, 0);
  const constructionDeposit = normalizeAmount(input.constructionDeposit, 0);

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
    deliveryRequired: input.deliveryRequired,
    deliveryDate: input.deliveryRequired ? input.deliveryDate : "",
    constructionRequired: input.constructionRequired,
    constructionStatus: input.constructionRequired ? input.constructionStatus : undefined,
    constructionDate: input.constructionRequired ? input.constructionDate : "",
    constructionStartTime: input.constructionRequired
      ? input.constructionStartTime
      : "",
    constructionCompany: input.constructionRequired
      ? input.constructionCompany.trim()
      : "",
    constructionTotalCost: input.constructionRequired ? constructionTotalCost : 0,
    constructionDeposit: input.constructionRequired ? constructionDeposit : 0,
    constructionBalance: input.constructionRequired
      ? normalizeAmount(
          input.constructionBalance || Math.max(constructionTotalCost - constructionDeposit, 0),
          0,
        )
      : 0,
  };
}

function normalizeSellItemInput(input: SellItemFormValues) {
  return {
    name: input.name.trim() || "이름 없는 판매 항목",
    currentLocation: input.currentLocation,
    askingPrice: normalizeAmount(input.askingPrice, 0),
    minimumPrice: normalizeAmount(input.minimumPrice, 0),
    sellByDate: input.sellByDate,
    status: input.status,
    platform: input.platform.trim(),
    note: input.note.trim(),
  };
}

function normalizeDisposalItemInput(input: DisposalItemFormValues) {
  return {
    name: input.name.trim() || "이름 없는 폐기 항목",
    currentLocation: input.currentLocation,
    disposalMethod: input.disposalMethod.trim(),
    reservationRequired: input.reservationRequired,
    disposalCost: normalizeAmount(input.disposalCost, 0),
    disposalDate: input.disposalDate,
    status: input.status,
    note: input.note.trim(),
  };
}

function normalizeMoveItemInput(input: MoveItemFormValues) {
  return {
    name: input.name.trim() || "이름 없는 이동 항목",
    currentLocation: input.currentLocation,
    targetLocation: input.targetLocation,
    status: input.status,
    note: input.note.trim(),
  };
}

function createTimestampedEntity<T extends Record<string, unknown>>(
  prefix: string,
  input: T,
) {
  const now = new Date().toISOString();

  return {
    id: createId(prefix),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
}

function updateEntitiesById<T extends { id: string }>(
  items: T[],
  id: string,
  updater: (item: T) => T,
) {
  return items.map((item) => (item.id === id ? updater(item) : item));
}

function removeEntityById<T extends { id: string }>(items: T[], id: string) {
  return items.filter((item) => item.id !== id);
}

function removeEntitiesByIds<T extends { id: string }>(items: T[], ids: string[]) {
  if (ids.length === 0) {
    return items;
  }

  const idSet = new Set(ids);

  return items.filter((item) => !idSet.has(item.id));
}

type PlannerPersistenceTarget =
  | {
      type: "local";
      storageKey: string;
    }
  | {
      type: "remote";
      storageKey: string;
      userId: string;
    }
  | null;

export function PlannerProvider({ children }: { children: ReactNode }) {
  const { isConfigured, isReady: isAuthReady, user } = usePlannerAuth();
  const [data, setData] = useState<PlannerData>(EMPTY_PLANNER_DATA);
  const [isReady, setIsReady] = useState(false);
  const [persistenceTarget, setPersistenceTarget] =
    useState<PlannerPersistenceTarget>(null);
  const skipNextRemotePersistRef = useRef(true);
  const lastRemoteSnapshotRef = useRef<string | null>(null);
  const serializedData = useMemo(() => JSON.stringify(data), [data]);

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    let isCancelled = false;

    async function hydratePlannerData() {
      setIsReady(false);

      const {
        storageKey,
        shouldMigrateLegacyData,
        shouldUseSampleData,
      } = getPlannerStorageConfig(window.location.hostname);
      const localRaw = window.localStorage.getItem(storageKey);
      const localParsed = localRaw ? parseStoredPlannerData(localRaw) : null;
      let localData = localParsed;

      if (!localData && shouldMigrateLegacyData) {
        const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
        localData = legacyRaw ? parseStoredPlannerData(legacyRaw) : null;

        if (localData) {
          window.localStorage.setItem(storageKey, JSON.stringify(localData));
        }
      }

      if (!user || !isConfigured) {
        const guestData =
          localData ?? (shouldUseSampleData ? buildSamplePlannerData() : EMPTY_PLANNER_DATA);

        if (isCancelled) {
          return;
        }

        skipNextRemotePersistRef.current = true;
        lastRemoteSnapshotRef.current = null;
        setPersistenceTarget({
          type: "local",
          storageKey,
        });
        setData(guestData);
        setIsReady(true);
        return;
      }

      const remoteResult = await loadPlannerDataForUser(user.id);

      if (isCancelled) {
        return;
      }

      if (remoteResult.error) {
        console.error(remoteResult.error);
        const fallbackData =
          localData ?? (shouldUseSampleData ? buildSamplePlannerData() : EMPTY_PLANNER_DATA);

        if (isMissingPlannerDocumentsTableError(remoteResult.error)) {
          console.warn(
            "planner_documents 테이블이 아직 없어 localStorage 모드로 동작합니다.",
          );
        }

        skipNextRemotePersistRef.current = true;
        lastRemoteSnapshotRef.current = null;
        setPersistenceTarget({
          type: "local",
          storageKey,
        });
        setData(fallbackData);
        setIsReady(true);
        return;
      }

      const shouldBootstrapRemote =
        !remoteResult.data && hasPlannerDataContent(localData);
      const nextData = remoteResult.data ?? localData ?? EMPTY_PLANNER_DATA;

      skipNextRemotePersistRef.current = !shouldBootstrapRemote;
      lastRemoteSnapshotRef.current = shouldBootstrapRemote
        ? null
        : JSON.stringify(nextData);
      setPersistenceTarget({
        type: "remote",
        storageKey,
        userId: user.id,
      });
      setData(nextData);
      setIsReady(true);
    }

    void hydratePlannerData();

    return () => {
      isCancelled = true;
    };
  }, [isAuthReady, isConfigured, user]);

  useEffect(() => {
    if (!isReady || !persistenceTarget) {
      return;
    }

    if (persistenceTarget.type === "local") {
      window.localStorage.setItem(persistenceTarget.storageKey, serializedData);
      return;
    }

    if (skipNextRemotePersistRef.current) {
      skipNextRemotePersistRef.current = false;
      lastRemoteSnapshotRef.current = serializedData;
      return;
    }

    if (lastRemoteSnapshotRef.current === serializedData) {
      return;
    }

    lastRemoteSnapshotRef.current = serializedData;

    void savePlannerDataForUser(persistenceTarget.userId, data).then(({ error }) => {
      if (error) {
        console.error(error);
      }
    });
  }, [data, isReady, persistenceTarget, serializedData]);

  const summary = buildDashboardSummary(data);

  const addFund = (input: FundFormValues) => {
    const nextFund = createTimestampedEntity("fund", normalizeFundInput(input));

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
      funds: updateEntitiesById(current.funds, id, (item) => ({
        ...item,
        ...normalized,
        updatedAt: now,
      })),
    }));
  };

  const deleteFund = (id: string) => {
    setData((current) => ({
      ...current,
      funds: removeEntityById(current.funds, id),
    }));
  };

  const addPurchase = (input: PurchaseFormValues) => {
    const normalized = normalizePurchaseInput(input);
    const calculated = calculatePurchaseAmounts(normalized);
    const nextPurchase = createTimestampedEntity("purchase", {
      ...normalized,
      ...calculated,
    });

    setData((current) => ({
      ...current,
      purchases: [nextPurchase, ...current.purchases],
    }));
  };

  const addPurchases = (inputs: PurchaseFormValues[]) => {
    const nextPurchases = inputs.map((input) => {
      const normalized = normalizePurchaseInput(input);
      const calculated = calculatePurchaseAmounts(normalized);

      return createTimestampedEntity("purchase", {
        ...normalized,
        ...calculated,
      });
    });

    setData((current) => ({
      ...current,
      purchases: [...nextPurchases, ...current.purchases],
    }));
  };

  const updatePurchase = (id: string, input: PurchaseFormValues) => {
    const now = new Date().toISOString();
    const normalized = normalizePurchaseInput(input);
    const calculated = calculatePurchaseAmounts(normalized);

    setData((current) => ({
      ...current,
      purchases: updateEntitiesById(current.purchases, id, (item) => ({
        ...item,
        ...normalized,
        ...calculated,
        updatedAt: now,
      })),
    }));
  };

  const deletePurchase = (id: string) => {
    setData((current) => ({
      ...current,
      purchases: removeEntityById(current.purchases, id),
    }));
  };

  const updatePurchaseStatuses = (ids: string[], status: PurchaseStatus) => {
    if (ids.length === 0) {
      return;
    }

    const idSet = new Set(ids);
    const now = new Date().toISOString();

    setData((current) => ({
      ...current,
      purchases: current.purchases.map((item) =>
        idSet.has(item.id) ? { ...item, status, updatedAt: now } : item,
      ),
    }));
  };

  const deletePurchases = (ids: string[]) => {
    setData((current) => ({
      ...current,
      purchases: removeEntitiesByIds(current.purchases, ids),
    }));
  };

  const addSellItem = (input: SellItemFormValues) => {
    const nextSellItem = createTimestampedEntity(
      "sell-item",
      normalizeSellItemInput(input),
    );

    setData((current) => ({
      ...current,
      sellItems: [nextSellItem, ...current.sellItems],
    }));
  };

  const addSellItems = (inputs: SellItemFormValues[]) => {
    const nextSellItems = inputs.map((input) =>
      createTimestampedEntity("sell-item", normalizeSellItemInput(input)),
    );

    setData((current) => ({
      ...current,
      sellItems: [...nextSellItems, ...current.sellItems],
    }));
  };

  const updateSellItem = (id: string, input: SellItemFormValues) => {
    const now = new Date().toISOString();
    const normalized = normalizeSellItemInput(input);

    setData((current) => ({
      ...current,
      sellItems: updateEntitiesById(current.sellItems, id, (item) => ({
        ...item,
        ...normalized,
        updatedAt: now,
      })),
    }));
  };

  const updateSellItemStatuses = (ids: string[], status: SellItemStatus) => {
    if (ids.length === 0) {
      return;
    }

    const idSet = new Set(ids);
    const now = new Date().toISOString();

    setData((current) => ({
      ...current,
      sellItems: current.sellItems.map((item) =>
        idSet.has(item.id) ? { ...item, status, updatedAt: now } : item,
      ),
    }));
  };

  const deleteSellItem = (id: string) => {
    setData((current) => ({
      ...current,
      sellItems: removeEntityById(current.sellItems, id),
    }));
  };

  const deleteSellItems = (ids: string[]) => {
    setData((current) => ({
      ...current,
      sellItems: removeEntitiesByIds(current.sellItems, ids),
    }));
  };

  const addDisposalItem = (input: DisposalItemFormValues) => {
    const nextDisposalItem = createTimestampedEntity(
      "disposal-item",
      normalizeDisposalItemInput(input),
    );

    setData((current) => ({
      ...current,
      disposalItems: [nextDisposalItem, ...current.disposalItems],
    }));
  };

  const updateDisposalItem = (id: string, input: DisposalItemFormValues) => {
    const now = new Date().toISOString();
    const normalized = normalizeDisposalItemInput(input);

    setData((current) => ({
      ...current,
      disposalItems: updateEntitiesById(current.disposalItems, id, (item) => ({
        ...item,
        ...normalized,
        updatedAt: now,
      })),
    }));
  };

  const deleteDisposalItem = (id: string) => {
    setData((current) => ({
      ...current,
      disposalItems: removeEntityById(current.disposalItems, id),
    }));
  };

  const deleteDisposalItems = (ids: string[]) => {
    setData((current) => ({
      ...current,
      disposalItems: removeEntitiesByIds(current.disposalItems, ids),
    }));
  };

  const addMoveItem = (input: MoveItemFormValues) => {
    const nextMoveItem = createTimestampedEntity(
      "move-item",
      normalizeMoveItemInput(input),
    );

    setData((current) => ({
      ...current,
      moveItems: [nextMoveItem, ...current.moveItems],
    }));
  };

  const updateMoveItem = (id: string, input: MoveItemFormValues) => {
    const now = new Date().toISOString();
    const normalized = normalizeMoveItemInput(input);

    setData((current) => ({
      ...current,
      moveItems: updateEntitiesById(current.moveItems, id, (item) => ({
        ...item,
        ...normalized,
        updatedAt: now,
      })),
    }));
  };

  const deleteMoveItem = (id: string) => {
    setData((current) => ({
      ...current,
      moveItems: removeEntityById(current.moveItems, id),
    }));
  };

  const deleteMoveItems = (ids: string[]) => {
    setData((current) => ({
      ...current,
      moveItems: removeEntitiesByIds(current.moveItems, ids),
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
        addPurchases,
        updatePurchase,
        updatePurchaseStatuses,
        deletePurchase,
        deletePurchases,
        addSellItem,
        addSellItems,
        updateSellItem,
        updateSellItemStatuses,
        deleteSellItem,
        deleteSellItems,
        addDisposalItem,
        updateDisposalItem,
        deleteDisposalItem,
        deleteDisposalItems,
        addMoveItem,
        updateMoveItem,
        deleteMoveItem,
        deleteMoveItems,
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
