import { eq } from "drizzle-orm";
import { json, withUser } from "@/lib/api";
import { db } from "@/lib/db";
import { orders, users } from "@/lib/db/schema";
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
  const { message } = await postMessage(id, user, String(body.body ?? ""));
  const [o] = await db.select({ residentId: orders.residentId, runnerId: orders.runnerId, code: orders.code }).from(orders).where(eq(orders.id, id));
  const sender = user.role === "admin" ? "Support" : (user.name ?? "").split(" ")[0] || "New message";
  const preview = message.body.slice(0, 120);

  const jobs: Promise<void>[] = [];
  if (o.residentId !== user.id) {
    jobs.push(notify(o.residentId, { title: sender, body: preview, url: `/orders/${id}?chat=1`, tag: `chat-${id}` }));
  }
  if (o.runnerId && o.runnerId !== user.id) {
    jobs.push(notify(o.runnerId, { title: sender, body: preview, url: `/runner/jobs/${id}?chat=1`, tag: `chat-${id}` }));
  }
  // No runner yet means the resident is asking support — let the admins know.
  if (user.role === "resident" && !o.runnerId) {
    const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
    jobs.push(notify(admins.map((a) => a.id), { title: `Support request #${o.code}`, body: preview, url: `/admin/orders/${id}` }));
  }
  await Promise.all(jobs);
  return json({ messages: await listMessages(id, user) });
});
