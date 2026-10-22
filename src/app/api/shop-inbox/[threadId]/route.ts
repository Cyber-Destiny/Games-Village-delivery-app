import { json, withUser } from "@/lib/api";
import { UserError } from "@/lib/errors";
import { vendorChat, vendorSend } from "@/lib/shop-chat";

type Ctx = { params: Promise<{ threadId: string }> };

function uuid(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new UserError("Chat not found.");
  return id;
}

export const GET = withUser<Ctx>(async (_req, user, { params }) => {
  const { threadId } = await params;
  return json(await vendorChat(user, uuid(threadId)));
});

export const POST = withUser<Ctx>(async (req, user, { params }) => {
  const { threadId } = await params;
  const body = (await req.json().catch(() => ({}))) as { body?: string };
  await vendorSend(user, uuid(threadId), String(body.body ?? ""));
  return json(await vendorChat(user, threadId));
});
