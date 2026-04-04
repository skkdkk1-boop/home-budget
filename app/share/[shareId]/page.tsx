import { SharedPlannerPage } from "@/components/planner/shared-planner-page";

export default async function SharePage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;

  return <SharedPlannerPage shareId={shareId} />;
}
