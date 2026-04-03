export const ROOM_OPTIONS = [
  "거실",
  "주방",
  "안방",
  "카페방",
  "컴퓨터방",
  "다용도실",
] as const;

export const PURCHASE_CATEGORY_OPTIONS = [
  "가전",
  "가구",
  "생활용품",
  "시공",
  "소품",
  "기타",
] as const;

export const PURCHASE_STATUS_OPTIONS = ["planned", "completed"] as const;
export const PAYMENT_TYPE_OPTIONS = ["lump", "installment"] as const;
export const SHIPPING_STATUS_OPTIONS = [
  "beforeOrder",
  "ordered",
  "shipping",
  "delivered",
] as const;
export const CONSTRUCTION_STATUS_OPTIONS = [
  "before",
  "scheduled",
  "done",
] as const;

export type Room = (typeof ROOM_OPTIONS)[number];
export type PurchaseCategory = (typeof PURCHASE_CATEGORY_OPTIONS)[number];
export type PurchaseStatus = (typeof PURCHASE_STATUS_OPTIONS)[number];
export type PaymentType = (typeof PAYMENT_TYPE_OPTIONS)[number];
export type ShippingStatus = (typeof SHIPPING_STATUS_OPTIONS)[number];
export type ConstructionStatus = (typeof CONSTRUCTION_STATUS_OPTIONS)[number];

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  planned: "구매 예정",
  completed: "구매 완료",
};

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  lump: "일시불",
  installment: "할부",
};

export const SHIPPING_STATUS_LABELS: Record<ShippingStatus, string> = {
  beforeOrder: "주문 전",
  ordered: "주문 완료",
  shipping: "배송 중",
  delivered: "배송 완료",
};

export const CONSTRUCTION_STATUS_LABELS: Record<ConstructionStatus, string> = {
  before: "진행 전",
  scheduled: "일정 확정",
  done: "완료",
};

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Fund extends BaseEntity {
  name: string;
  amount: number;
  isUsable: boolean;
}

export interface Purchase extends BaseEntity {
  status: PurchaseStatus;
  room: Room;
  category: PurchaseCategory;
  name: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  paymentType: PaymentType;
  installmentMonths: number;
  monthlyPayment: number;
  link: string;
  note: string;
}

export interface Shipping extends BaseEntity {
  itemName: string;
  room: Room;
  shippingStatus: ShippingStatus;
  expectedDate: string;
  note: string;
}

export interface Construction extends BaseEntity {
  name: string;
  room: Room;
  constructionStatus: ConstructionStatus;
  constructionDate: string;
  cost: number;
  company: string;
  contact: string;
  note: string;
}

export interface PlannerData {
  funds: Fund[];
  purchases: Purchase[];
  shippings: Shipping[];
  constructions: Construction[];
}

export interface DashboardSummary {
  totalFunds: number;
  usableFunds: number;
  completedPurchaseTotal: number;
  plannedPurchaseTotal: number;
  installmentMonthlyTotal: number;
  remainingActual: number;
  remainingProjected: number;
  upcomingShippings: Shipping[];
  upcomingConstructions: Construction[];
}

export interface FundFormValues {
  name: string;
  amount: number;
  isUsable: boolean;
}

export interface PurchaseFormValues {
  status: PurchaseStatus;
  room: Room;
  category: PurchaseCategory;
  name: string;
  unitPrice: number;
  quantity: number;
  paymentType: PaymentType;
  installmentMonths: number;
  link: string;
  note: string;
}

export interface ShippingFormValues {
  itemName: string;
  room: Room;
  shippingStatus: ShippingStatus;
  expectedDate: string;
  note: string;
}

export interface ConstructionFormValues {
  name: string;
  room: Room;
  constructionStatus: ConstructionStatus;
  constructionDate: string;
  cost: number;
  company: string;
  contact: string;
  note: string;
}

export type PurchaseSortOption = "recent" | "priceHigh" | "priceLow";
