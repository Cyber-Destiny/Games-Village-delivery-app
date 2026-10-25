import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/dal";
import { listResidentOrders } from "@/lib/orders/queries";
import { OrdersList } from "./orders-list";

export const metadata: Metadata = { title: "Errands" };

export default async function OrdersPage() {
  const user = await requireRole("resident", "admin");
  const orders = await listResidentOrders(user.id, 100);
  return (
    <main className="safe-pt-4 px-5 pb-36">
      <h1 className="mb-5 font-display text-[30px] font-bold text-ink">Your errands</h1>
      <OrdersList orders={orders} />
    </main>
  );
}
