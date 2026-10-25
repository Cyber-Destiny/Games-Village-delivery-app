import { getVendorsAdmin } from "@/lib/admin";
import { requireRole } from "@/lib/auth/dal";
import { getSettings } from "@/lib/settings";
import { VendorsView } from "./vendors-view";

export const metadata = { title: "Shops" };

export default async function VendorsPage() {
  await requireRole("admin");
  const [vendors, s] = await Promise.all([getVendorsAdmin(), getSettings()]);
  return <VendorsView vendors={vendors} runnerBuys={s.runnerBuys} />;
}
