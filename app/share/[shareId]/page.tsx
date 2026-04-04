import { DashboardSection } from "@/components/planner/dashboard-section";

export default async function SharePage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  await params;

  return <DashboardSection />;
}
