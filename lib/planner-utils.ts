import type {
  Construction,
  DashboardSummary,
  PaymentType,
  PlannerData,
  Purchase,
  Shipping,
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
    return item.status === "completed" ? sum + item.totalPrice : sum;
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
      purchases: parsed.purchases.map((item) =>
        withPurchaseAmounts(item as Purchase),
      ),
      shippings: parsed.shippings,
      constructions: parsed.constructions,
    };
  } catch {
    return null;
  }
}
