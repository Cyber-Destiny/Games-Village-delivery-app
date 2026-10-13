import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import { markPaymentSuccess } from "@/lib/orders/service";
import { appUrl, verifyTransaction } from "@/lib/paystack";

// Paystack redirects here after checkout: /pay/callback?reference=...
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ref = url.searchParams.get("reference") ?? url.searchParams.get("trxref") ?? "";
  const [payment] = ref ? await db.select().from(payments).where(eq(payments.reference, ref)) : [];
  if (!payment) return NextResponse.redirect(`${appUrl()}/orders`);

  try {
    const tx = await verifyTransaction(ref);
    if (tx.status === "success" && tx.currency === "NGN") {
      await markPaymentSuccess(ref, { amount: tx.amount, channel: tx.channel, raw: tx.raw });
    }
  } catch (err) {
    console.error("[pay:callback] verify failed", err);
  }
  return NextResponse.redirect(`${appUrl()}/orders/${payment.orderId}?paid=1`);
}
