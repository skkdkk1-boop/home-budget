export type HomeBudgetSummary = {
  totalBudgetLabel: string;
  actualTotal: number;
  budgetLimit: number;
  isOverBudget: boolean;
  gapAmount: number;
};

export function buildHomeBudgetSummary(): HomeBudgetSummary {
  const totalBudgetLabel = "100~200만원";
  const budgetLimit = 2000000;
  const actualTotal = 1640000;
  const gapAmount = budgetLimit - actualTotal;
  const isOverBudget = actualTotal > budgetLimit;

  return {
    totalBudgetLabel,
    actualTotal,
    budgetLimit,
    isOverBudget,
    gapAmount,
  };
}
