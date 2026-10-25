import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { APP_NAME } from "./brand";
import { db } from "./db";
import { supportMessages, supportThreads, users, vendors, type User } from "./db/schema";
import { UserError } from "./errors";
import { notify } from "./notify";
import { formatPhoneLocal } from "./phone";
import { getSettings, isOpenNow } from "./settings";
import { formatHours } from "./time";
import { shortName } from "./shop-chat";

// In-app chat with the support team. Every resident, runner and shop staff member has
// one thread; admins answer from /admin/support. Numbers aren't hidden here, since
// people often share them so we can call back.

const MAX_LEN = 1500;

const firstName = (n: string | null | undefined) => (n ?? "").trim().split(/\s+/)[0] || "";

export type SupportChatMessage = {
  id: string;
  body: string;
  side: "user" | "support" | "system";
  mine: boolean;
  sender: string;
  createdAt: string;
  orderId: null;
};

function clean(body: string) {
  const text = body.trim().slice(0, MAX_LEN);
  if (!text) throw new UserError("Type a message.");
  return text;
}

async function addMessage(threadId: string, side: SupportChatMessage["side"], body: string, senderId: string | null) {
  const now = new Date();
  await db.insert(supportMessages).values({ threadId, side, body, senderId, createdAt: now });
  await db
    .update(supportThreads)
    .set({
      lastMessageAt: now,
      lastPreview: body.slice(0, 140),
      ...(side === "user" ? { userReadAt: now } : side === "support" ? { supportReadAt: now } : {}),
    })
    .where(eq(supportThreads.id, threadId));
}

async function loadMessages(threadId: string, viewer: "user" | "support"): Promise<SupportChatMessage[]> {
  const rows = await db
    .select({ m: supportMessages, name: users.name })
    .from(supportMessages)
    .leftJoin(users, eq(users.id, supportMessages.senderId))
    .where(eq(supportMessages.threadId, threadId))
    .orderBy(desc(supportMessages.createdAt))
    .limit(300);
  return rows.reverse().map(({ m, name }) => ({
    id: m.id,
    body: m.body,
    side: m.side,
    mine: m.side === viewer,
    sender: m.side === "system" ? "" : firstName(name),
    createdAt: m.createdAt.toISOString(),
    orderId: null,
  }));
}

async function adminIds() {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.isActive, true)));
  return rows.map((r) => r.id);
}

// ── residents, runners, shop staff ───────────────────────────

export async function supportChat(user: User) {
  const [thread] = await db.select().from(supportThreads).where(eq(supportThreads.userId, user.id));
  const messages = thread ? await loadMessages(thread.id, "user") : [];
  if (thread) await db.update(supportThreads).set({ userReadAt: new Date() }).where(eq(supportThreads.id, thread.id));
  return { messages, seenAt: thread?.supportReadAt?.toISOString() ?? null };
}

export async function supportSend(user: User, body: string) {
  if (user.role === "admin") throw new UserError("Reply from the Support tab in the admin console.");
  const text = clean(body);
  const [thread] = await db
    .insert(supportThreads)
    .values({ userId: user.id })
    .onConflictDoUpdate({ target: supportThreads.userId, set: { userId: user.id } })
    .returning();
  const [last] = await db
    .select({ at: supportMessages.createdAt })
    .from(supportMessages)
    .where(eq(supportMessages.threadId, thread.id))
    .orderBy(desc(supportMessages.createdAt))
    .limit(1);
  await addMessage(thread.id, "user", text, user.id);

  // First message in a while: say what happens next.
  if (!last || Date.now() - last.at.getTime() > 6 * 60 * 60_000) {
    const s = await getSettings();
    const phone = s.supportPhone ? ` For anything urgent, call or WhatsApp ${formatPhoneLocal(s.supportPhone)}.` : "";
    await addMessage(
      thread.id,
      "system",
      isOpenNow({ ...s, serviceOpen: true })
        ? `Thanks, we've got your message. Someone from the team will reply here shortly.${phone}`
        : `Thanks, we've got your message. We're open ${formatHours(s.openTime, s.closeTime)} and will reply here as soon as we're back.${phone}`,
      null,
    );
  }

  await notify(await adminIds(), {
    title: `Support · ${shortName(user.name)}`,
    body: text.slice(0, 120),
    url: `/admin/support/${thread.id}`,
    tag: `support-${thread.id}`,
  });
}

/** Unread replies from support (for badges). */
export async function supportUnread(userId: string) {
  const rows = (await db.execute(
    sql`select count(*)::int as n from support_messages m join support_threads t on t.id = m.thread_id
        where t.user_id = ${userId} and m.side = 'support' and m.created_at > coalesce(t.user_read_at, 'epoch'::timestamptz)`,
  )) as unknown as Array<{ n: number }>;
  return rows[0]?.n ?? 0;
}

// ── admin ────────────────────────────────────────────────────

const unreadForSupport = sql<number>`(select count(*)::int from support_messages m where m.thread_id = "support_threads"."id" and m.side = 'user' and m.created_at > coalesce("support_threads"."support_read_at", 'epoch'::timestamptz))`;

function roleLabel(u: Pick<User, "role" | "vendorId">, shop: string | null) {
  if (u.role === "runner") return "Runner";
  if (u.role === "vendor") return shop ? `Shop · ${shop}` : "Shop";
  return shop ? `Resident · works at ${shop}` : "Resident";
}

export async function supportInbox() {
  const rows = await db
    .select({ t: supportThreads, u: users, shop: vendors.name, unread: unreadForSupport })
    .from(supportThreads)
    .innerJoin(users, eq(users.id, supportThreads.userId))
    .leftJoin(vendors, eq(vendors.id, users.vendorId))
    .orderBy(desc(supportThreads.lastMessageAt))
    .limit(200);
  return rows.map(({ t, u, shop, unread }) => ({
    id: t.id,
    name: u.name || u.email || "No name yet",
    role: roleLabel(u, shop),
    preview: t.lastPreview ?? "",
    at: t.lastMessageAt.toISOString(),
    unread,
  }));
}

export type SupportInboxRow = Awaited<ReturnType<typeof supportInbox>>[number];

/** Conversations with messages the team hasn't read yet. */
export async function supportWaiting() {
  const rows = (await db.execute(
    sql`select count(distinct t.id)::int as n from support_threads t join support_messages m on m.thread_id = t.id
        where m.side = 'user' and m.created_at > coalesce(t.support_read_at, 'epoch'::timestamptz)`,
  )) as unknown as Array<{ n: number }>;
  return rows[0]?.n ?? 0;
}

async function threadWithUser(threadId: string) {
  const [row] = await db
    .select({ t: supportThreads, u: users, shop: vendors.name })
    .from(supportThreads)
    .innerJoin(users, eq(users.id, supportThreads.userId))
    .leftJoin(vendors, eq(vendors.id, users.vendorId))
    .where(eq(supportThreads.id, threadId));
  if (!row) throw new UserError("Conversation not found.");
  return row;
}

export async function adminSupportChat(threadId: string) {
  const { t, u, shop } = await threadWithUser(threadId);
  const messages = await loadMessages(t.id, "support");
  await db.update(supportThreads).set({ supportReadAt: new Date() }).where(eq(supportThreads.id, t.id));
  return {
    person: {
      id: u.id,
      name: u.name || "No name yet",
      phone: u.phone,
      email: u.email,
      role: roleLabel(u, shop),
      address: u.block && u.house ? `Block ${u.block}, House ${u.house}` : null,
      active: u.isActive,
    },
    messages,
    seenAt: t.userReadAt?.toISOString() ?? null,
  };
}

export async function adminSupportSend(admin: User, threadId: string, body: string) {
  const { t } = await threadWithUser(threadId);
  const text = clean(body);
  await addMessage(t.id, "support", text, admin.id);
  await notify(t.userId, { title: `${APP_NAME} support`, body: text.slice(0, 120), url: "/support", tag: `support-${t.id}` });
}
