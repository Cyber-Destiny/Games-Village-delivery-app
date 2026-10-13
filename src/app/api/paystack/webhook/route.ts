import { NextResponse } from "next/server";
import { markPaymentSuccess } from "@/lib/orders/service";
import { verifyWebhookSignature } from "@/lib/paystack";
import { applyTransferOutcome } from "@/lib/payouts";

// Paystack → us. Configure in the Paystack dashboard: Settings → API Keys & Webhooks.
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-paystack-signature"))) {
    return new NextResponse("Invalid signature", { status: 401 });
  }
  const event = JSON.parse(raw) as { event: string; data: Record<string, unknown> };
  const data = event.data ?? {};
  const ref = String(data.reference ?? "");
  try {
    switch (event.event) {
      case "charge.success":
        if (data.currency === "NGN") {
          await markPaymentSuccess(ref, { amount: Number(data.amount), channel: (data.channel as string) ?? null, raw: data });
        }
        break;
      case "transfer.success":
        await applyTransferOutcome(ref, "success");
        break;
      case "transfer.failed":
        await applyTransferOutcome(ref, "failed", String(data.reason ?? data.gateway_response ?? "Transfer failed"));
        break;
      case "transfer.reversed":
        await applyTransferOutcome(ref, "reversed", "Transfer reversed by the bank");
        break;
    }
  } catch (err) {
    console.error("[paystack:webhook]", event.event, ref, err);
    return new NextResponse("Error", { status: 500 }); // Paystack will retry
  }
  return new NextResponse("ok");
}
