import { json, withUser } from "@/lib/api";
import { notify } from "@/lib/notify";
import { listMessages, postMessage } from "@/lib/orders/queries";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withUser<Ctx>(async (_req, user, { params }) => {
  const { id } = await params;
  return json({ messages: await listMessages(id, user) });
});

export const POST = withUser<Ctx>(async (req, user, { params }) => {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { body?: string };
  const { recipientIds, message } = await postMessage(id, user, String(body.body ?? ""));
  const sender = user.role === "admin" ? "Support" : (user.name ?? "").split(" ")[0] || "New message";
  await notify(recipientIds, {
    title: sender,
    body: message.body.slice(0, 120),
    url: user.role === "runner" ? `/orders/${id}?chat=1` : `/runner/jobs/${id}?chat=1`,
    tag: `chat-${id}`,
  });
  return json({ messages: await listMessages(id, user) });
});
