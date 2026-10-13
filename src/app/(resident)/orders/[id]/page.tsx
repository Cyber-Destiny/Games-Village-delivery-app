import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/dal";
import { getOrderForViewer } from "@/lib/orders/queries";
import { Tracker } from "./tracker";

export const metadata: Metadata = { title: "Errand" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("resident", "admin");
  const { id } = await params;
  const order = await getOrderForViewer(id, user).catch(() => null);
  if (!order || order.resident.id !== user.id) notFound();
  return <Tracker initial={order} />;
}
