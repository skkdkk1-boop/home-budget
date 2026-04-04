import type { ReactNode } from "react";

import { SharedPlannerShell } from "@/components/planner/shared-planner-shell";

export default async function ShareLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;

  return <SharedPlannerShell shareId={shareId}>{children}</SharedPlannerShell>;
}
