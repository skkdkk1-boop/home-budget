import type {
  Construction,
  DisposalItem,
  DashboardSummary,
  MoveItem,
  PaymentType,
  PlannerData,
  PurchaseCategory,
  PurchaseFormValues,
  Purchase,
  Room,
  SellItem,
  Shipping,
} from "@/lib/planner-types";
import {
  PURCHASE_CATEGORY_OPTIONS,
  ROOM_OPTIONS,
} from "@/lib/planner-types";

export const STORAGE_KEY = "jeongri-home-planner-v1";

const currencyFormatter = new Intl.NumberFormat("ko-KR");
const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  weekday: "short",
});

export const EMPTY_PLANNER_DATA: PlannerData = {
  funds: [],
  purchases: [],
  shippings: [],
  constructions: [],
  sellItems: [],
  disposalItems: [],
  moveItems: [],
};

export const EMPTY_DASHBOARD_SUMMARY: DashboardSummary = {
  totalFunds: 0,
  usableFunds: 0,
  completedPurchaseTotal: 0,
  plannedPurchaseTotal: 0,
  installmentMonthlyTotal: 0,
  remainingActual: 0,
  remainingProjected: 0,
  upcomingShippings: [],
  upcomingConstructions: [],
};

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatCurrency(value: number) {
  return `${currencyFormatter.format(Math.round(value || 0))}원`;
}

export function formatDate(value: string) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return dateFormatter.format(parsed);
}

export function todayKey() {
  return toDateInput(new Date());
}

export function toDateInput(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function shiftDate(days: number) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return toDateInput(value);
}

export function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeAmount(value: number, minimum = 0) {
  if (!Number.isFinite(value)) {
    return minimum;
  }

  return Math.max(minimum, Math.round(value));
}

export function normalizeLink(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function calculatePurchaseAmounts(input: {
  unitPrice: number;
  quantity: number;
  paymentType: PaymentType;
  installmentMonths: number;
}) {
  const unitPrice = normalizeAmount(input.unitPrice, 0);
  const quantity = normalizeAmount(input.quantity, 1);
  const totalPrice = unitPrice * quantity;
  const installmentMonths =
    input.paymentType === "installment"
      ? normalizeAmount(input.installmentMonths, 1)
      : 0;
  const monthlyPayment =
    input.paymentType === "installment" && installmentMonths > 0
      ? Math.round(totalPrice / installmentMonths)
      : 0;

  return {
    totalPrice,
    installmentMonths,
    monthlyPayment,
  };
}

export function withPurchaseAmounts(purchase: Purchase) {
  const calculated = calculatePurchaseAmounts({
    unitPrice: purchase.unitPrice,
    quantity: purchase.quantity,
    paymentType: purchase.paymentType,
    installmentMonths: purchase.installmentMonths,
  });

  return {
    ...purchase,
    ...calculated,
  };
}

export function compareRecent(a: { updatedAt: string }, b: { updatedAt: string }) {
  return b.updatedAt.localeCompare(a.updatedAt);
}

export function compareDateAsc(left: string, right: string) {
  if (!left && !right) {
    return 0;
  }

  if (!left) {
    return 1;
  }

  if (!right) {
    return -1;
  }

  return left.localeCompare(right);
}

export function toggleSelectionItem(selectedIds: string[], targetId: string) {
  return selectedIds.includes(targetId)
    ? selectedIds.filter((id) => id !== targetId)
    : [...selectedIds, targetId];
}

export function keepVisibleSelections(
  selectedIds: string[],
  visibleIds: string[],
) {
  const visibleIdSet = new Set(visibleIds);

  return selectedIds.filter((id) => visibleIdSet.has(id));
}

export function toggleAllVisibleSelections(
  selectedIds: string[],
  visibleIds: string[],
  isAllVisibleSelected: boolean,
) {
  if (isAllVisibleSelected) {
    const visibleIdSet = new Set(visibleIds);

    return selectedIds.filter((id) => !visibleIdSet.has(id));
  }

  return Array.from(new Set([...selectedIds, ...visibleIds]));
}

export function getProjectedRemainingInsight(value: number) {
  if (value > 5_000_000) {
    return {
      label: "여유 있음",
      tone: "success" as const,
      message:
        "현재 자금 상태가 안정적입니다. 추가 구매를 진행해도 괜찮아요.",
    };
  }

  if (value >= 2_000_000) {
    return {
      label: "적정",
      tone: "neutral" as const,
      message: "현재 자금 상태는 적정 수준입니다. 지출 계획을 유지하세요.",
    };
  }

  return {
    label: "부족",
    tone: "danger" as const,
    message:
      "현재 예상 지출이 자금을 초과할 수 있습니다. 구매 계획을 조정해보세요.",
  };
}

export function parsePurchaseBulkInput(rawText: string) {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const items: PurchaseFormValues[] = [];
  const errors: string[] = [];
  const invalidLines: string[] = [];

  lines.forEach((line, index) => {
    const parts = line.split(",").map((part) => part.trim());

    if (parts.length < 5) {
      errors.push(`${index + 1}줄: 쉼표로 5개 값을 입력해주세요.`);
      invalidLines.push(line);
      return;
    }

    const name = parts[0] ?? "";
    const roomRaw = parts[1] ?? "";
    const categoryRaw = parts[2] ?? "";
    const priceRaw = parts.slice(3, -1).join("");
    const quantityRaw = parts[parts.length - 1] ?? "";
    const unitPrice = Number(priceRaw.replace(/[^\d.-]/g, ""));
    const quantity = Number(quantityRaw.replace(/[^\d.-]/g, ""));

    if (!name) {
      errors.push(`${index + 1}줄: 품목명이 비어 있어요.`);
      invalidLines.push(line);
      return;
    }

    if (!ROOM_OPTIONS.includes(roomRaw as Room)) {
      errors.push(`${index + 1}줄: 공간 값이 올바르지 않아요.`);
      invalidLines.push(line);
      return;
    }

    if (!PURCHASE_CATEGORY_OPTIONS.includes(categoryRaw as PurchaseCategory)) {
      errors.push(`${index + 1}줄: 유형 값이 올바르지 않아요.`);
      invalidLines.push(line);
      return;
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      errors.push(`${index + 1}줄: 가격은 0 이상의 숫자로 입력해주세요.`);
      invalidLines.push(line);
      return;
    }

    if (!Number.isFinite(quantity) || quantity < 1) {
      errors.push(`${index + 1}줄: 수량은 1 이상이어야 해요.`);
      invalidLines.push(line);
      return;
    }

    items.push({
      status: "planned",
      room: roomRaw as Room,
      category: categoryRaw as PurchaseCategory,
      name,
      unitPrice,
      quantity,
      paymentType: "lump",
      installmentMonths: 12,
      scheduleDate: "",
      link: "",
      note: "",
    });
  });

  return {
    items,
    errors,
    invalidLines,
  };
}

export function sortShippingsByUpcoming(items: Shipping[]) {
  return [...items].sort((a, b) => {
    return (
      compareDateAsc(a.expectedDate, b.expectedDate) ||
      compareRecent(a, b)
    );
  });
}

export function sortConstructionsByDate(items: Construction[]) {
  return [...items].sort((a, b) => {
    return (
      compareDateAsc(a.constructionDate, b.constructionDate) ||
      compareRecent(a, b)
    );
  });
}

export function buildDashboardSummary(data: PlannerData): DashboardSummary {
  const totalFunds = data.funds.reduce((sum, item) => sum + item.amount, 0);
  const usableFunds = data.funds.reduce((sum, item) => {
    return item.isUsable ? sum + item.amount : sum;
  }, 0);
  const completedPurchaseTotal = data.purchases.reduce((sum, item) => {
    return item.status !== "planned" ? sum + item.totalPrice : sum;
  }, 0);
  const plannedPurchaseTotal = data.purchases.reduce((sum, item) => {
    return item.status === "planned" ? sum + item.totalPrice : sum;
  }, 0);
  const installmentMonthlyTotal = data.purchases.reduce((sum, item) => {
    return item.paymentType === "installment" ? sum + item.monthlyPayment : sum;
  }, 0);
  const remainingActual = usableFunds - completedPurchaseTotal;
  const remainingProjected =
    usableFunds - completedPurchaseTotal - plannedPurchaseTotal;
  const today = todayKey();
  const upcomingShippings = sortShippingsByUpcoming(data.shippings)
    .filter((item) => item.shippingStatus !== "delivered" && item.expectedDate >= today)
    .slice(0, 5);
  const upcomingConstructions = sortConstructionsByDate(data.constructions)
    .filter((item) => item.constructionStatus !== "done" && item.constructionDate >= today)
    .slice(0, 5);

  return {
    totalFunds,
    usableFunds,
    completedPurchaseTotal,
    plannedPurchaseTotal,
    installmentMonthlyTotal,
    remainingActual,
    remainingProjected,
    upcomingShippings:
      upcomingShippings.length > 0
        ? upcomingShippings
        : sortShippingsByUpcoming(data.shippings)
            .filter((item) => item.shippingStatus !== "delivered")
            .slice(0, 5),
    upcomingConstructions:
      upcomingConstructions.length > 0
        ? upcomingConstructions
        : sortConstructionsByDate(data.constructions)
            .filter((item) => item.constructionStatus !== "done")
            .slice(0, 5),
  };
}

export function parseStoredPlannerData(raw: string): PlannerData | null {
  try {
    const parsed = JSON.parse(raw) as Partial<PlannerData>;

    if (
      !parsed ||
      !Array.isArray(parsed.funds) ||
      !Array.isArray(parsed.purchases) ||
      !Array.isArray(parsed.shippings) ||
      !Array.isArray(parsed.constructions)
    ) {
      return null;
    }

    return {
      funds: parsed.funds,
      purchases: parsed.purchases.map((item) => {
        const purchase = item as Purchase & { scheduleDate?: string };

        return withPurchaseAmounts({
          ...purchase,
          scheduleDate:
            typeof purchase.scheduleDate === "string" ? purchase.scheduleDate : "",
        });
      }),
      shippings: parsed.shippings,
      constructions: parsed.constructions,
      sellItems: Array.isArray(parsed.sellItems)
        ? parsed.sellItems.map((item) => item as SellItem)
        : [],
      disposalItems: Array.isArray(parsed.disposalItems)
        ? parsed.disposalItems.map((item) => item as DisposalItem)
        : [],
      moveItems: Array.isArray(parsed.moveItems)
        ? parsed.moveItems.map((item) => item as MoveItem)
        : [],
    };
  } catch {
    return null;
  }
}
