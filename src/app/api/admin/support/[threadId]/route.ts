import { json, withUser } from "@/lib/api";
import { isStaff } from "@/lib/auth/roles";
import { UserError } from "@/lib/errors";
import { adminSupportChat, adminSupportSend } from "@/lib/support";

type Ctx = { params: Promise<{ threadId: string }> };

function uuid(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new UserError("Conversation not found.");
  return id;
}

export const GET = withUser<Ctx>(async (_req, user, { params }) => {
  if (!isStaff(user)) throw new UserError("Staff only.");
  return json(await adminSupportChat(uuid((await params).threadId)));
});

export const POST = withUser<Ctx>(async (req, user, { params }) => {
  if (!isStaff(user)) throw new UserError("Staff only.");
  const threadId = uuid((await params).threadId);
  const body = (await req.json().catch(() => ({}))) as { body?: string };
  await adminSupportSend(user, threadId, String(body.body ?? ""));
  return json(await adminSupportChat(threadId));
});
