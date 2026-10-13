import { getVendorsAdmin } from "@/lib/admin";
import { requireRole } from "@/lib/auth/dal";
import { VendorsView } from "./vendors-view";

export const metadata = { title: "Shops" };

export default async function VendorsPage() {
  await requireRole("admin");
  return <VendorsView vendors={await getVendorsAdmin()} />;
}
