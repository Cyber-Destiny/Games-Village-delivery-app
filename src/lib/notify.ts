import "server-only";
import webpush from "web-push";
import { eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { pushSubscriptions, users } from "./db/schema";
import { sendSms } from "./sms";

let vapidReady: boolean | null = null;

function pushEnabled(): boolean {
  if (vapidReady !== null) return vapidReady;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return (vapidReady = false);
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:hello@example.com", pub, priv);
    vapidReady = true;
  } catch (err) {
    console.error("[push] invalid VAPID keys", err);
    vapidReady = false;
  }
  return vapidReady;
}

type Message = {
  title: string;
  body: string;
  url?: string;
  /** Also send as SMS (keep these rare — they cost money). */
  sms?: string;
  tag?: string;
};

/** Fire-and-forget notification to one or more users. Never throws. */
export async function notify(userIds: string | string[], msg: Message): Promise<void> {
  const ids = (Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean);
  if (!ids.length) return;
  try {
    const jobs: Promise<unknown>[] = [];
    if (pushEnabled()) {
      const subs = await db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.userId, ids));
      const payload = JSON.stringify({ title: msg.title, body: msg.body, url: msg.url ?? "/", tag: msg.tag });
      for (const s of subs) {
        jobs.push(
          webpush
            .sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 600 })
            .catch(async (err: { statusCode?: number }) => {
              if (err?.statusCode === 404 || err?.statusCode === 410) {
                await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, s.id));
              }
            }),
        );
      }
    }
    if (msg.sms) {
      const rows = await db.select({ phone: users.phone }).from(users).where(inArray(users.id, ids));
      for (const r of rows) jobs.push(sendSms(r.phone, msg.sms));
    }
    await Promise.allSettled(jobs);
  } catch (err) {
    console.error("[notify] failed", err);
  }
}
