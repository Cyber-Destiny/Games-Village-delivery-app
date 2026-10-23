"use server";

import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import { attempt, UserError } from "@/lib/errors";
import { markPaymentSuccess } from "@/lib/orders/service";
import { demoMode } from "@/lib/demo";
import { paystackLive } from "@/lib/paystack";

export async function completeDemoPayment(reference: string) {
  return attempt(async () => {
    if (paystackLive() || !demoMode()) throw new UserError("Demo payments are disabled.");
    const user = await getCurrentUser();
    const [p] = await db.select().from(payments).where(eq(payments.reference, reference));
    if (!user || !p || p.userId !== user.id) throw new UserError("Payment not found.");
    await markPaymentSuccess(reference, { amount: p.amount, channel: "demo" });
    return { orderId: p.orderId };
  });
}
