import { getOverview } from "@/lib/admin";
import { requireRole } from "@/lib/auth/dal";
import { OverviewView } from "./overview";

export const metadata = { title: "Overview" };

export default async function AdminHome() {
  await requireRole("admin");
  return <OverviewView initial={await getOverview()} />;
}
