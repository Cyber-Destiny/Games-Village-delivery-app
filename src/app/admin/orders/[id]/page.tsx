import { notFound } from "next/navigation";
import { freeRunners } from "@/lib/admin";
import { requireRole } from "@/lib/auth/dal";
import { STAFF_ROLES } from "@/lib/auth/roles";
import { getOrderForViewer } from "@/lib/orders/queries";
import { AdminOrder } from "./admin-order";

export const metadata = { title: "Errand" };

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(...STAFF_ROLES);
  const { id } = await params;
  const order = await getOrderForViewer(id, user).catch(() => null);
  if (!order) notFound();
  const runners = await freeRunners();
  return <AdminOrder initial={order} runners={runners} />;
}
