import { and, eq } from "drizzle-orm";
import { json, withUser } from "@/lib/api";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { UserError } from "@/lib/errors";

type Body = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

export const POST = withUser(async (req, user) => {
  const sub = (await req.json().catch(() => ({}))) as Body;
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) throw new UserError("Invalid subscription");
  await db
    .insert(pushSubscriptions)
    .values({ userId: user.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId: user.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth } });
  return json({ ok: true });
});

export const DELETE = withUser(async (req, user) => {
  const { endpoint } = (await req.json().catch(() => ({}))) as Body;
  if (endpoint) {
    await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, user.id)));
  }
  return json({ ok: true });
});
