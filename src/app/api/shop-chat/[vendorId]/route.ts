import { json, withUser } from "@/lib/api";
import { UserError } from "@/lib/errors";
import { residentChat, residentSend } from "@/lib/shop-chat";

type Ctx = { params: Promise<{ vendorId: string }> };

function uuid(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new UserError("Shop not found.");
  return id;
}

export const GET = withUser<Ctx>(async (_req, user, { params }) => {
  const { vendorId } = await params;
  if (user.role !== "resident") throw new UserError("Only residents can chat with shops.");
  return json(await residentChat(user, uuid(vendorId)));
});

export const POST = withUser<Ctx>(async (req, user, { params }) => {
  const { vendorId } = await params;
  if (user.role !== "resident") throw new UserError("Only residents can chat with shops.");
  const body = (await req.json().catch(() => ({}))) as { body?: string };
  await residentSend(user, uuid(vendorId), String(body.body ?? ""));
  return json(await residentChat(user, vendorId));
});
