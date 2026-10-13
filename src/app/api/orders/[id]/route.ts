import { json, withUser } from "@/lib/api";
import { getOrderForViewer } from "@/lib/orders/queries";
import { checkPendingPayment, latestPendingPayment, tick } from "@/lib/orders/service";

export const GET = withUser<{ params: Promise<{ id: string }> }>(async (_req, user, { params }) => {
  const { id } = await params;
  await tick();
  let order = await getOrderForViewer(id, user);
  // Catch payments whose webhook/redirect we missed (order checkout or a top-up).
  if ((order.status === "awaiting_payment" || order.status === "at_vendor") && order.viewerRole === "resident") {
    const pending = await latestPendingPayment(id);
    if (pending && Date.now() - pending.createdAt.getTime() > 8000) {
      await checkPendingPayment(pending.reference);
      order = await getOrderForViewer(id, user);
    }
  }
  return json({ order });
});
