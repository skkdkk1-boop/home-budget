import type {
  Construction,
  ConstructionStatus,
  DisposalItem,
  DashboardSummary,
  MoveItem,
  PaymentType,
  PlannerData,
  PurchaseCategory,
  PurchaseFormValues,
  Purchase,
  PurchaseStatus,
  Room,
  SellItem,
  Shipping,
  StatusTone,
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

export function sanitizeMoneyInput(value: string) {
  return value.replace(/[^\d]/g, "");
}

export function parseMoneyInput(value: string | number) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  const sanitized = sanitizeMoneyInput(value);

  if (!sanitized) {
    return 0;
  }

  return Number(sanitized);
}

export function formatMoneyInput(value: string | number) {
  const parsed = parseMoneyInput(value);

  if (parsed === 0) {
    return typeof value === "string" && !sanitizeMoneyInput(value) ? "" : "0";
  }

  return currencyFormatter.format(parsed);
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
      link: "",
      note: "",
      deliveryRequired: false,
      deliveryDate: "",
      constructionRequired: false,
      constructionDate: "",
      constructionStartTime: "",
      constructionCompany: "",
      constructionTotalCost: 0,
      constructionDeposit: 0,
      constructionBalance: 0,
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
      compareDateAsc(a.deliveryDate, b.deliveryDate) ||
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

export function isDeliveryPurchase(item: Purchase) {
  return item.deliveryRequired;
}

export function getDeliveryScheduleMeta(deliveryDate: string): {
  label: string;
  tone: StatusTone;
} {
  const today = todayKey();

  if (!deliveryDate) {
    return {
      label: "일정 미정",
      tone: "neutral",
    };
  }

  if (deliveryDate < today) {
    return {
      label: "지난 일정",
      tone: "warning",
    };
  }

  if (deliveryDate === today) {
    return {
      label: "오늘 배송",
      tone: "info",
    };
  }

  return {
    label: "배송 예정",
    tone: "success",
  };
}

export function mapPurchaseToShipping(item: Purchase): Shipping {
  return {
    id: item.id,
    itemName: item.name,
    room: item.room,
    deliveryDate: item.deliveryDate,
    note: item.note,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export function deriveShippingsFromPurchases(purchases: Purchase[]) {
  return purchases.filter(isDeliveryPurchase).map(mapPurchaseToShipping);
}

export function isConstructionPurchase(item: Purchase) {
  return item.constructionRequired;
}

export function mapConstructionStatusToPurchaseStatus(
  status: ConstructionStatus,
): PurchaseStatus {
  return status === "done" ? "completed" : "planned";
}

export function mapPurchaseToConstruction(item: Purchase): Construction {
  const derivedStatus: ConstructionStatus = item.constructionDate
    ? "scheduled"
    : "before";
  const constructionStatus: ConstructionStatus =
    item.status === "completed"
      ? "done"
      : item.constructionStatus && item.constructionStatus !== "done"
        ? item.constructionStatus
        : derivedStatus;

  return {
    id: item.id,
    name: item.name,
    room: item.room,
    constructionStatus,
    constructionDate: item.constructionDate,
    constructionStartTime: item.constructionStartTime,
    constructionCompany: item.constructionCompany,
    constructionTotalCost: item.constructionTotalCost || item.totalPrice,
    constructionDeposit: item.constructionDeposit,
    constructionBalance:
      item.constructionBalance ||
      Math.max((item.constructionTotalCost || item.totalPrice) - item.constructionDeposit, 0),
    note: item.note,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export function deriveConstructionsFromPurchases(purchases: Purchase[]) {
  return purchases.filter(isConstructionPurchase).map(mapPurchaseToConstruction);
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
  const derivedShippings = deriveShippingsFromPurchases(data.purchases);
  const derivedConstructions = deriveConstructionsFromPurchases(data.purchases);
  const upcomingShippings = sortShippingsByUpcoming(derivedShippings)
    .filter((item) => item.deliveryDate >= today)
    .slice(0, 5);
  const upcomingConstructions = sortConstructionsByDate(derivedConstructions)
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
        : sortShippingsByUpcoming(derivedShippings)
            .slice(0, 5),
    upcomingConstructions:
      upcomingConstructions.length > 0
        ? upcomingConstructions
        : sortConstructionsByDate(derivedConstructions)
            .filter((item) => item.constructionStatus !== "done")
            .slice(0, 5),
  };
}

export function parseStoredPlannerData(raw: string): PlannerData | null {
  try {
    const parsed = JSON.parse(raw) as Partial<PlannerData> & {
      shippings?: Shipping[];
      constructions?: Array<
        Construction & {
          cost?: number;
          company?: string;
          contact?: string;
        }
      >;
    };

    if (
      !parsed ||
      !Array.isArray(parsed.funds) ||
      !Array.isArray(parsed.purchases)
    ) {
      return null;
    }

    const purchases = parsed.purchases.map((item) => {
      const purchase = item as Partial<Purchase> & { scheduleDate?: string };
      const legacyScheduleDate =
        typeof purchase.scheduleDate === "string" ? purchase.scheduleDate : "";
      const constructionRequired =
        typeof purchase.constructionRequired === "boolean"
          ? purchase.constructionRequired
          : Boolean(
              purchase.category === "시공" ||
                purchase.room === "시공" ||
                purchase.constructionStatus ||
                purchase.constructionCompany,
            );
      const deliveryRequired =
        typeof purchase.deliveryRequired === "boolean"
          ? purchase.deliveryRequired
          : Boolean(!constructionRequired && legacyScheduleDate);
      const constructionTotalCost = normalizeAmount(
        Number(
          purchase.constructionTotalCost ?? purchase.totalPrice ?? purchase.unitPrice ?? 0,
        ),
        0,
      );
      const constructionDeposit = normalizeAmount(
        Number(purchase.constructionDeposit ?? 0),
        0,
      );

      return withPurchaseAmounts({
        id: purchase.id ?? createId("purchase"),
        status: (purchase.status as PurchaseStatus) ?? "planned",
        room: (purchase.room as Purchase["room"]) ?? ROOM_OPTIONS[0],
        category: (purchase.category as PurchaseCategory) ?? "기타",
        name: typeof purchase.name === "string" ? purchase.name : "",
        unitPrice: normalizeAmount(Number(purchase.unitPrice ?? 0), 0),
        quantity: normalizeAmount(Number(purchase.quantity ?? 1), 1),
        totalPrice: normalizeAmount(Number(purchase.totalPrice ?? 0), 0),
        paymentType: purchase.paymentType === "installment" ? "installment" : "lump",
        installmentMonths: normalizeAmount(Number(purchase.installmentMonths ?? 0), 0),
        monthlyPayment: normalizeAmount(Number(purchase.monthlyPayment ?? 0), 0),
        link: typeof purchase.link === "string" ? purchase.link : "",
        note: typeof purchase.note === "string" ? purchase.note : "",
        deliveryRequired,
        deliveryDate:
          typeof purchase.deliveryDate === "string"
            ? purchase.deliveryDate
            : deliveryRequired
              ? legacyScheduleDate
              : "",
        constructionRequired,
        constructionStatus: purchase.constructionStatus,
        constructionDate:
          typeof purchase.constructionDate === "string"
            ? purchase.constructionDate
            : constructionRequired
              ? legacyScheduleDate
              : "",
        constructionStartTime:
          typeof purchase.constructionStartTime === "string"
            ? purchase.constructionStartTime
            : "",
        constructionCompany:
          typeof purchase.constructionCompany === "string"
            ? purchase.constructionCompany
            : "",
        constructionTotalCost,
        constructionDeposit,
        constructionBalance: normalizeAmount(
          Number(
            purchase.constructionBalance ??
              Math.max(constructionTotalCost - constructionDeposit, 0),
          ),
          0,
        ),
        createdAt:
          typeof purchase.createdAt === "string"
            ? purchase.createdAt
            : new Date().toISOString(),
        updatedAt:
          typeof purchase.updatedAt === "string"
            ? purchase.updatedAt
            : new Date().toISOString(),
      });
    });
    const shippingKeys = new Set(
      purchases
        .filter((item) => item.deliveryRequired)
        .map((item) => `${item.name}::${item.deliveryDate}`),
    );
    const migratedShippingPurchases = Array.isArray(parsed.shippings)
      ? parsed.shippings
          .map(
            (item) =>
              item as Shipping & {
                expectedDate?: string;
              },
          )
          .filter((item) => {
            const deliveryDate =
              typeof item.deliveryDate === "string"
                ? item.deliveryDate
                : item.expectedDate ?? "";
            const key = `${item.itemName}::${deliveryDate}`;

            if (shippingKeys.has(key)) {
              return false;
            }

            shippingKeys.add(key);
            return true;
          })
          .map((item) =>
            withPurchaseAmounts({
              id: `purchase-shipping-${item.id}`,
              status: "planned",
              room: item.room,
              category: "기타",
              name: item.itemName,
              unitPrice: 0,
              quantity: 1,
              totalPrice: 0,
              paymentType: "lump",
              installmentMonths: 0,
              monthlyPayment: 0,
              link: "",
              note: item.note,
              deliveryRequired: true,
              deliveryDate:
                typeof item.deliveryDate === "string"
                  ? item.deliveryDate
                  : item.expectedDate ?? "",
              constructionRequired: false,
              constructionStatus: undefined,
              constructionDate: "",
              constructionStartTime: "",
              constructionCompany: "",
              constructionTotalCost: 0,
              constructionDeposit: 0,
              constructionBalance: 0,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            }),
          )
      : [];
    const constructionKeys = new Set(
      purchases
        .filter(isConstructionPurchase)
        .map((item) => `${item.name}::${item.constructionDate}::${item.constructionTotalCost}`),
    );
    const migratedConstructionPurchases = Array.isArray(parsed.constructions)
      ? parsed.constructions
          .map(
            (item) =>
              item as Construction & {
                cost?: number;
                company?: string;
                contact?: string;
              },
          )
          .filter((item) => {
            const totalCost = normalizeAmount(
              Number(item.constructionTotalCost ?? item.cost ?? 0),
              0,
            );
            const key = `${item.name}::${item.constructionDate}::${totalCost}`;

            if (constructionKeys.has(key)) {
              return false;
            }

            constructionKeys.add(key);
            return true;
          })
          .map((item) => {
            const totalCost = normalizeAmount(
              Number(item.constructionTotalCost ?? item.cost ?? 0),
              0,
            );
            const deposit = normalizeAmount(Number(item.constructionDeposit ?? 0), 0);
            const calculated = calculatePurchaseAmounts({
              unitPrice: totalCost,
              quantity: 1,
              paymentType: "lump",
              installmentMonths: 0,
            });

            return withPurchaseAmounts({
              id: `purchase-migrated-${item.id}`,
              status: mapConstructionStatusToPurchaseStatus(item.constructionStatus),
              room: item.room,
              category: "시공",
              name: item.name,
              unitPrice: totalCost,
              quantity: 1,
              totalPrice: calculated.totalPrice,
              paymentType: "lump",
              installmentMonths: calculated.installmentMonths,
              monthlyPayment: calculated.monthlyPayment,
              link: "",
              note: item.note,
              deliveryRequired: false,
              deliveryDate: "",
              constructionRequired: true,
              constructionStatus: item.constructionStatus,
              constructionDate: item.constructionDate,
              constructionStartTime: item.constructionStartTime ?? "",
              constructionCompany: item.constructionCompany ?? item.company ?? "",
              constructionTotalCost: totalCost,
              constructionDeposit: deposit,
              constructionBalance: normalizeAmount(
                Number(
                  item.constructionBalance ?? Math.max(totalCost - deposit, 0),
                ),
                0,
              ),
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            });
          })
      : [];

    return {
      funds: parsed.funds,
      purchases: [...purchases, ...migratedShippingPurchases, ...migratedConstructionPurchases],
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
