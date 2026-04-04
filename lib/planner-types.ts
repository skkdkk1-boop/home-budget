export const ROOM_OPTIONS = [
  "거실",
  "주방",
  "안방",
  "카페방",
  "컴퓨터방",
  "다용도실",
] as const;

export const PURCHASE_MULTI_ROOM_EXTRA_OPTIONS = ["시공", "기타"] as const;
export const PURCHASE_MULTI_ROOM_OPTIONS = [
  ...ROOM_OPTIONS,
  ...PURCHASE_MULTI_ROOM_EXTRA_OPTIONS,
] as const;

export const SELL_LOCATION_OPTIONS = [
  "거실",
  "주방",
  "안방",
  "작은방",
  "안방베란다",
  "작은방베란다",
] as const;

export const PURCHASE_CATEGORY_OPTIONS = [
  "가전",
  "가구",
  "생활용품",
  "시공",
  "소품",
  "기타",
] as const;

export const PURCHASE_STATUS_OPTIONS = ["planned", "completed", "shipping"] as const;
export const PAYMENT_TYPE_OPTIONS = ["lump", "installment"] as const;
export const CONSTRUCTION_STATUS_OPTIONS = [
  "before",
  "scheduled",
  "done",
] as const;
export const SELL_ITEM_STATUS_OPTIONS = [
  "planned",
  "selling",
  "reserved",
  "completed",
] as const;
export const DISPOSAL_STATUS_OPTIONS = [
  "planned",
  "needsMethod",
  "reserved",
  "completed",
] as const;
export const MOVE_ITEM_STATUS_OPTIONS = [
  "before",
  "sorted",
  "planned",
  "completed",
] as const;

export type Room = (typeof ROOM_OPTIONS)[number];
export type PurchaseRoom = (typeof PURCHASE_MULTI_ROOM_OPTIONS)[number];
export type SellLocation = (typeof SELL_LOCATION_OPTIONS)[number];
export type PurchaseCategory = (typeof PURCHASE_CATEGORY_OPTIONS)[number];
export type PurchaseStatus = (typeof PURCHASE_STATUS_OPTIONS)[number];
export type PaymentType = (typeof PAYMENT_TYPE_OPTIONS)[number];
export type ConstructionStatus = (typeof CONSTRUCTION_STATUS_OPTIONS)[number];
export type SellItemStatus = (typeof SELL_ITEM_STATUS_OPTIONS)[number];
export type DisposalStatus = (typeof DISPOSAL_STATUS_OPTIONS)[number];
export type MoveItemStatus = (typeof MOVE_ITEM_STATUS_OPTIONS)[number];
export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  planned: "구매 예정",
  completed: "구매 완료",
  shipping: "배송 중",
};

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  lump: "일시불",
  installment: "할부",
};

export const CONSTRUCTION_STATUS_LABELS: Record<ConstructionStatus, string> = {
  before: "진행 전",
  scheduled: "일정 확정",
  done: "완료",
};

export const SELL_ITEM_STATUS_LABELS: Record<SellItemStatus, string> = {
  planned: "판매 예정",
  selling: "판매 중",
  reserved: "예약됨",
  completed: "판매 완료",
};

export const DISPOSAL_STATUS_LABELS: Record<DisposalStatus, string> = {
  planned: "폐기 예정",
  needsMethod: "방법 확인 필요",
  reserved: "예약 완료",
  completed: "폐기 완료",
};

export const MOVE_ITEM_STATUS_LABELS: Record<MoveItemStatus, string> = {
  before: "정리 전",
  sorted: "분류 완료",
  planned: "이동 예정",
  completed: "이동 완료",
};

export const PURCHASE_STATUS_TONES: Record<PurchaseStatus, StatusTone> = {
  planned: "warning",
  completed: "success",
  shipping: "info",
};

export const CONSTRUCTION_STATUS_TONES: Record<
  ConstructionStatus,
  StatusTone
> = {
  before: "neutral",
  scheduled: "info",
  done: "success",
};

export const SELL_ITEM_STATUS_TONES: Record<SellItemStatus, StatusTone> = {
  planned: "neutral",
  selling: "info",
  reserved: "warning",
  completed: "success",
};

export const DISPOSAL_STATUS_TONES: Record<DisposalStatus, StatusTone> = {
  planned: "neutral",
  needsMethod: "warning",
  reserved: "info",
  completed: "success",
};

export const MOVE_ITEM_STATUS_TONES: Record<MoveItemStatus, StatusTone> = {
  before: "neutral",
  sorted: "info",
  planned: "warning",
  completed: "success",
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
  room: PurchaseRoom;
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
  deliveryRequired: boolean;
  deliveryDate: string;
  constructionRequired: boolean;
  constructionStatus?: ConstructionStatus;
  constructionDate: string;
  constructionStartTime: string;
  constructionCompany: string;
  constructionTotalCost: number;
  constructionDeposit: number;
  constructionBalance: number;
}

export interface Shipping extends BaseEntity {
  itemName: string;
  room: PurchaseRoom;
  deliveryDate: string;
  note: string;
}

export interface Construction extends BaseEntity {
  name: string;
  room: PurchaseRoom;
  constructionStatus: ConstructionStatus;
  constructionDate: string;
  constructionStartTime: string;
  constructionCompany: string;
  constructionTotalCost: number;
  constructionDeposit: number;
  constructionBalance: number;
  note: string;
}

export interface SellItem extends BaseEntity {
  name: string;
  currentLocation: SellLocation;
  askingPrice: number;
  minimumPrice: number;
  sellByDate: string;
  status: SellItemStatus;
  platform: string;
  note: string;
}

export interface DisposalItem extends BaseEntity {
  name: string;
  currentLocation: SellLocation;
  disposalMethod: string;
  reservationRequired: boolean;
  disposalCost: number;
  disposalDate: string;
  status: DisposalStatus;
  note: string;
}

export interface MoveItem extends BaseEntity {
  name: string;
  currentLocation: SellLocation;
  targetLocation: SellLocation;
  status: MoveItemStatus;
  note: string;
}

export interface PlannerData {
  funds: Fund[];
  purchases: Purchase[];
  sellItems: SellItem[];
  disposalItems: DisposalItem[];
  moveItems: MoveItem[];
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
  room: PurchaseRoom;
  category: PurchaseCategory;
  name: string;
  unitPrice: number;
  quantity: number;
  paymentType: PaymentType;
  installmentMonths: number;
  link: string;
  note: string;
  deliveryRequired: boolean;
  deliveryDate: string;
  constructionRequired: boolean;
  constructionStatus?: ConstructionStatus;
  constructionDate: string;
  constructionStartTime: string;
  constructionCompany: string;
  constructionTotalCost: number;
  constructionDeposit: number;
  constructionBalance: number;
}

export interface ConstructionFormValues {
  name: string;
  room: PurchaseRoom;
  constructionStatus: ConstructionStatus;
  constructionDate: string;
  constructionStartTime: string;
  constructionCompany: string;
  constructionTotalCost: number;
  constructionDeposit: number;
  constructionBalance: number;
  note: string;
}

export interface SellItemFormValues {
  name: string;
  currentLocation: SellLocation;
  askingPrice: number;
  minimumPrice: number;
  sellByDate: string;
  status: SellItemStatus;
  platform: string;
  note: string;
}

export interface DisposalItemFormValues {
  name: string;
  currentLocation: SellLocation;
  disposalMethod: string;
  reservationRequired: boolean;
  disposalCost: number;
  disposalDate: string;
  status: DisposalStatus;
  note: string;
}

export interface MoveItemFormValues {
  name: string;
  currentLocation: SellLocation;
  targetLocation: SellLocation;
  status: MoveItemStatus;
  note: string;
}

export type PurchaseSortOption = "recent" | "priceHigh" | "priceLow";
export type SellItemSortOption = "recent" | "deadline" | "priceHigh" | "priceLow";
export type DisposalItemSortOption = "recent" | "deadline" | "costHigh" | "costLow";
export type MoveItemSortOption = "recent" | "currentLocation" | "targetLocation";
