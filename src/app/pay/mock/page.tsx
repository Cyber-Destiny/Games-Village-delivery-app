import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { orders, payments } from "@/lib/db/schema";
import { demoMode } from "@/lib/demo";
import { paystackLive } from "@/lib/paystack";
import { DemoCheckout } from "./demo-checkout";

export const metadata = { title: "Demo checkout" };

export default async function MockPayPage({ searchParams }: { searchParams: Promise<{ reference?: string }> }) {
  if (paystackLive() || !demoMode()) notFound();
  const user = await requireUser();
  const { reference } = await searchParams;
  if (!reference) notFound();
  const [p] = await db.select().from(payments).where(eq(payments.reference, reference));
  if (!p || p.userId !== user.id) notFound();
  const [o] = p.orderId ? await db.select({ code: orders.code }).from(orders).where(eq(orders.id, p.orderId)) : [];
  return (
    <DemoCheckout
      reference={reference}
      amount={p.amount}
      orderId={p.orderId}
      code={o?.code ?? ""}
      purpose={p.purpose}
      alreadyPaid={p.status === "success"}
    />
  );
}
