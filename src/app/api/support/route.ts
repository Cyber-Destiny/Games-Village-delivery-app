import { json, withUser } from "@/lib/api";
import { supportChat, supportSend } from "@/lib/support";

export const GET = withUser(async (_req, user) => json(await supportChat(user)));

export const POST = withUser(async (req, user) => {
  const body = (await req.json().catch(() => ({}))) as { body?: string };
  await supportSend(user, String(body.body ?? ""));
  return json(await supportChat(user));
});
