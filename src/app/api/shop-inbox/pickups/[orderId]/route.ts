import { json, withUser } from "@/lib/api";
import { isStaff } from "@/lib/auth/roles";
import { UserError } from "@/lib/errors";
import { confirmShopPayment } from "@/lib/orders/service";

type Ctx = { params: Promise<{ orderId: string }> };

/** Shop staff (or Runam staff) say whether a resident's payment reached the shop. */
export const POST = withUser<Ctx>(async (req, user, { params }) => {
  const { orderId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) throw new UserError("Errand not found.");
  if (!user.vendorId && !isStaff(user)) throw new UserError("Errand not found.");
  const body = (await req.json().catch(() => ({}))) as { received?: boolean };
  await confirmShopPayment(user, orderId, body.received === true);
  return json({ ok: true });
});
