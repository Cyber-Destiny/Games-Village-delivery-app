import { getPayoutsAdmin } from "@/lib/admin";
import { requireRole } from "@/lib/auth/dal";
import { paystackLive, paystackTestKey } from "@/lib/paystack";
import { PayoutsView } from "./payouts-view";

export const metadata = { title: "Payouts" };

export default async function PayoutsPage() {
  await requireRole("admin");
  const mode = !paystackLive() ? "demo" : paystackTestKey() ? "test" : "live";
  return <PayoutsView data={await getPayoutsAdmin()} mode={mode} />;
}
