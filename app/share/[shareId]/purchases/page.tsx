import { Suspense } from "react";

import { PurchasesSection } from "@/components/planner/purchases-section";
import { LoadingState } from "@/components/planner/ui";

export default function SharedPurchasesPage() {
  return (
    <Suspense
      fallback={
        <div className="page-shell">
          <LoadingState />
        </div>
      }
    >
      <PurchasesSection />
    </Suspense>
  );
}
