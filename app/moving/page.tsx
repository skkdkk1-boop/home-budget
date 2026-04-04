import { Suspense } from "react";

import { MovingSection } from "@/components/planner/moving-section";
import { LoadingState } from "@/components/planner/ui";

export default function MovingPage() {
  return (
    <Suspense
      fallback={
        <div className="page-shell">
          <LoadingState />
        </div>
      }
    >
      <MovingSection />
    </Suspense>
  );
}
