import { requireRole } from "@/lib/auth/dal";
import { getRunnerState } from "@/lib/orders/queries";
import { RunnerDashboard } from "./dashboard";

export const metadata = { title: "Errands" };

export default async function RunnerHome() {
  const user = await requireRole("runner");
  const state = await getRunnerState(user);
  return <RunnerDashboard name={user.name ?? "Runner"} initial={state} />;
}
