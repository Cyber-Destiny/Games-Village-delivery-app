import { getPayoutsAdmin } from "@/lib/admin";
import { requireRole } from "@/lib/auth/dal";
import { demoMode } from "@/lib/demo";
import { paystackLive, paystackTestKey } from "@/lib/paystack";
import { PayoutsView } from "./payouts-view";

export const metadata = { title: "Payouts" };

export default async function PayoutsPage() {
  await requireRole("admin");
  const mode = !paystackLive() ? (demoMode() ? "demo" : "off") : paystackTestKey() ? "test" : "live";
  return <PayoutsView data={await getPayoutsAdmin()} mode={mode} />;
}
