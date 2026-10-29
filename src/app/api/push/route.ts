import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { json, withUser } from "@/lib/api";
import { PUSH_COOKIE } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { UserError } from "@/lib/errors";

type Body = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

/** Whether this device's subscription is on for the signed-in user (it may belong to whoever signed in before). */
export const GET = withUser(async (req, user) => {
  const endpoint = new URL(req.url).searchParams.get("endpoint");
  if (!endpoint) return json({ subscribed: false });
  const [row] = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, user.id)));
  return json({ subscribed: !!row });
});

export const POST = withUser(async (req, user) => {
  const sub = (await req.json().catch(() => ({}))) as Body;
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) throw new UserError("Invalid subscription");
  const [row] = await db
    .insert(pushSubscriptions)
    .values({ userId: user.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth })
    .onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: { userId: user.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth } })
    .returning({ id: pushSubscriptions.id });
  // Remembered so signing out on this device stops its alerts.
  (await cookies()).set(PUSH_COOKIE, row.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return json({ ok: true });
});

export const DELETE = withUser(async (req, user) => {
  const { endpoint } = (await req.json().catch(() => ({}))) as Body;
  if (endpoint) {
    await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, user.id)));
  }
  (await cookies()).delete(PUSH_COOKIE);
  return json({ ok: true });
});
