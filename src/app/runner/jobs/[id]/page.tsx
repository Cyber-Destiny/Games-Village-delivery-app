import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/dal";
import { getOrderForViewer } from "@/lib/orders/queries";
import { getSettings } from "@/lib/settings";
import { JobFlow } from "./job-flow";

export const metadata = { title: "Errand" };

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("runner");
  const { id } = await params;
  const order = await getOrderForViewer(id, user).catch(() => null);
  // Reassigned or not theirs → back to the dashboard.
  if (!order || order.viewerRole !== "runner") redirect("/runner");
  const s = await getSettings();
  return <JobFlow initial={order} commissionPct={s.runnerCommissionPct} />;
}
