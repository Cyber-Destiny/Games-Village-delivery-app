import { requireRole } from "@/lib/auth/dal";
import { getRunnerEarnings, getRunnerState } from "@/lib/orders/queries";
import { EarningsView } from "./earnings-view";

export const metadata = { title: "Earnings" };

export default async function EarningsPage() {
  const user = await requireRole("runner");
  const [state, data] = await Promise.all([getRunnerState(user), getRunnerEarnings(user.id)]);
  return <EarningsView state={state} data={data} />;
}
