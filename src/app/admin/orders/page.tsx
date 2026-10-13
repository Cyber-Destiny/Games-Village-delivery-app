import { listAdminOrders, type OrderFilter } from "@/lib/admin";
import { requireRole } from "@/lib/auth/dal";
import { OrdersTable } from "./orders-table";

export const metadata = { title: "Errands" };

const FILTERS: OrderFilter[] = ["active", "attention", "delivered", "cancelled", "all"];

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string }> }) {
  await requireRole("admin");
  const sp = await searchParams;
  const filter = (FILTERS.includes(sp.filter as OrderFilter) ? sp.filter : "active") as OrderFilter;
  const rows = await listAdminOrders(filter, sp.q ?? "");
  return <OrdersTable rows={rows} filter={filter} q={sp.q ?? ""} />;
}
