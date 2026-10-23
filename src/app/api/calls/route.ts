import { json, withUser } from "@/lib/api";
import { startCall, type CallTarget } from "@/lib/calls";
import { UserError } from "@/lib/errors";

const UUID = /^[0-9a-f-]{36}$/i;

export const POST = withUser(async (req, user) => {
  const body = (await req.json().catch(() => ({}))) as { vendorId?: string; threadId?: string; orderId?: string; offer?: string };
  let target: CallTarget;
  if (body.vendorId && UUID.test(body.vendorId)) target = { vendorId: body.vendorId };
  else if (body.threadId && UUID.test(body.threadId)) target = { threadId: body.threadId };
  else if (body.orderId && UUID.test(body.orderId)) target = { orderId: body.orderId };
  else throw new UserError("Who are you calling?");
  return json({ call: await startCall(user, target, String(body.offer ?? "")) });
});
