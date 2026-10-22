import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import { orders, shopMessages, shopThreads, users, vendors, type Order, type User } from "./db/schema";
import { UserError } from "./errors";
import { notify } from "./notify";

// Residents chat with shops inside the app. Shop staff are users linked to a shop
// (users.vendorId), added by the admin. One thread per resident per shop.

const MAX_LEN = 800;

const firstName = (n: string | null | undefined) => (n ?? "").trim().split(/\s+/)[0] || "";

function shortName(n: string | null | undefined) {
  const parts = (n ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Customer";
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
}

/**
 * Hides phone numbers and WhatsApp links so orders and payments stay in the app.
 * Bank account numbers (10 digits) are left alone, since shops share them for payment.
 */
export function maskContacts(text: string): string {
  return text
    .replace(/(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)\/\S*/gi, "[link hidden]")
    .replace(/(?<!\d)(?:\+?\s*234[\s-]*|0)[789][01](?:[\s-]*\d){8}(?!\d)/g, "[number hidden]");
}

function clean(body: string) {
  const text = maskContacts(body.trim().slice(0, MAX_LEN));
  if (!text) throw new UserError("Type a message.");
  return text;
}

async function staffIds(vendorId: string) {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.vendorId, vendorId), eq(users.isActive, true)));
  return rows.map((r) => r.id);
}

async function activeShop(vendorId: string) {
  const [shop] = await db.select().from(vendors).where(and(eq(vendors.id, vendorId), eq(vendors.isActive, true)));
  if (!shop) throw new UserError("That shop isn't available.");
  return shop;
}

/** Finds or creates the thread between a resident and a shop. */
async function ensureThread(vendorId: string, residentId: string) {
  const [t] = await db
    .insert(shopThreads)
    .values({ vendorId, residentId })
    .onConflictDoUpdate({ target: [shopThreads.vendorId, shopThreads.residentId], set: { vendorId } })
    .returning();
  return t;
}

async function addMessage(threadId: string, side: "resident" | "vendor" | "system", body: string, senderId: string | null, orderId?: string) {
  const now = new Date();
  const [m] = await db.insert(shopMessages).values({ threadId, side, body, senderId, orderId: orderId ?? null, createdAt: now }).returning();
  await db
    .update(shopThreads)
    .set({
      lastMessageAt: now,
      lastPreview: body.slice(0, 140),
      ...(side === "resident" ? { residentReadAt: now } : side === "vendor" ? { vendorReadAt: now } : {}),
    })
    .where(eq(shopThreads.id, threadId));
  return m;
}

export type ShopChatMessage = {
  id: string;
  body: string;
  side: "resident" | "vendor" | "system";
  mine: boolean;
  sender: string;
  createdAt: string;
  orderId: string | null;
};

async function loadMessages(threadId: string, viewerSide: "resident" | "vendor", shopName: string): Promise<ShopChatMessage[]> {
  const rows = await db
    .select({ m: shopMessages, name: users.name })
    .from(shopMessages)
    .leftJoin(users, eq(users.id, shopMessages.senderId))
    .where(eq(shopMessages.threadId, threadId))
    .orderBy(desc(shopMessages.createdAt))
    .limit(200);
  return rows.reverse().map(({ m, name }) => ({
    id: m.id,
    body: m.body,
    side: m.side,
    mine: m.side === viewerSide,
    sender: m.side === "system" ? "" : m.side === "vendor" ? shopName : firstName(name) || "Customer",
    createdAt: m.createdAt.toISOString(),
    orderId: m.orderId,
  }));
}

function unreadSql(side: "resident" | "vendor") {
  // Messages from the other side (and app notices) since this side last read the thread.
  const readCol = side === "resident" ? sql.raw(`"shop_threads"."resident_read_at"`) : sql.raw(`"shop_threads"."vendor_read_at"`);
  return sql<number>`(select count(*)::int from shop_messages m where m.thread_id = "shop_threads"."id" and m.side <> ${side} and m.created_at > coalesce(${readCol}, 'epoch'::timestamptz))`;
}

// ── residents ────────────────────────────────────────────────

export async function residentChat(user: User, vendorId: string) {
  const shop = await activeShop(vendorId);
  const [thread] = await db
    .select()
    .from(shopThreads)
    .where(and(eq(shopThreads.vendorId, vendorId), eq(shopThreads.residentId, user.id)));
  const messages = thread ? await loadMessages(thread.id, "resident", shop.name) : [];
  if (thread) await db.update(shopThreads).set({ residentReadAt: new Date() }).where(eq(shopThreads.id, thread.id));
  return {
    shop: { id: shop.id, name: shop.name, image: shop.image, category: shop.category, location: shop.location, hours: shop.hours },
    online: (await staffIds(vendorId)).length > 0,
    messages,
    seenAt: thread?.vendorReadAt?.toISOString() ?? null,
  };
}

export async function residentSend(user: User, vendorId: string, body: string) {
  const shop = await activeShop(vendorId);
  const staff = await staffIds(vendorId);
  if (!staff.length) throw new UserError(`${shop.name} isn't taking chats yet. A runner can buy it for you instead.`);
  const text = clean(body);
  const thread = await ensureThread(vendorId, user.id);
  await addMessage(thread.id, "resident", text, user.id);
  await notify(staff, { title: shortName(user.name), body: text.slice(0, 120), url: `/shop/chats/${thread.id}`, tag: `shopchat-${thread.id}` });
}

export async function residentThreads(userId: string, limit = 50) {
  const rows = await db
    .select({ t: shopThreads, name: vendors.name, image: vendors.image, category: vendors.category, unread: unreadSql("resident") })
    .from(shopThreads)
    .innerJoin(vendors, eq(vendors.id, shopThreads.vendorId))
    .where(eq(shopThreads.residentId, userId))
    .orderBy(desc(shopThreads.lastMessageAt))
    .limit(limit);
  return rows.map(({ t, name, image, category, unread }) => ({
    vendorId: t.vendorId,
    name,
    image,
    category,
    preview: t.lastPreview ?? "",
    at: t.lastMessageAt.toISOString(),
    unread,
  }));
}

export type ResidentThread = Awaited<ReturnType<typeof residentThreads>>[number];

// ── shop staff ───────────────────────────────────────────────

function assertStaff(user: User): string {
  if (!user.vendorId) throw new UserError("You're not set up for a shop.");
  return user.vendorId;
}

export async function vendorInbox(user: User) {
  const vendorId = assertStaff(user);
  const rows = await db
    .select({ t: shopThreads, name: users.name, unread: unreadSql("vendor") })
    .from(shopThreads)
    .innerJoin(users, eq(users.id, shopThreads.residentId))
    .where(eq(shopThreads.vendorId, vendorId))
    .orderBy(desc(shopThreads.lastMessageAt))
    .limit(100);
  return rows.map(({ t, name, unread }) => ({
    id: t.id,
    customer: shortName(name),
    preview: t.lastPreview ?? "",
    at: t.lastMessageAt.toISOString(),
    unread,
  }));
}

export type VendorThread = Awaited<ReturnType<typeof vendorInbox>>[number];

async function vendorOwnThread(user: User, threadId: string) {
  const vendorId = assertStaff(user);
  const [row] = await db
    .select({ t: shopThreads, name: users.name })
    .from(shopThreads)
    .innerJoin(users, eq(users.id, shopThreads.residentId))
    .where(and(eq(shopThreads.id, threadId), eq(shopThreads.vendorId, vendorId)));
  if (!row) throw new UserError("Chat not found.");
  return row;
}

export async function vendorChat(user: User, threadId: string) {
  const { t, name } = await vendorOwnThread(user, threadId);
  const messages = await loadMessages(t.id, "vendor", "");
  await db.update(shopThreads).set({ vendorReadAt: new Date() }).where(eq(shopThreads.id, t.id));
  return { customer: shortName(name), messages, seenAt: t.residentReadAt?.toISOString() ?? null };
}

export async function vendorSend(user: User, threadId: string, body: string) {
  const { t } = await vendorOwnThread(user, threadId);
  const [shop] = await db.select({ name: vendors.name }).from(vendors).where(eq(vendors.id, t.vendorId));
  const text = clean(body);
  await addMessage(t.id, "vendor", text, user.id);
  await notify(t.residentId, { title: shop?.name ?? "Shop", body: text.slice(0, 120), url: `/chat/${t.vendorId}`, tag: `shopchat-${t.id}` });
}

/** Unread shop messages for a resident, across all their chats (for badges). */
export async function residentUnread(userId: string) {
  const rows = (await db.execute(
    sql`select count(*)::int as n from shop_messages m join shop_threads t on t.id = m.thread_id
        where t.resident_id = ${userId} and m.side <> 'resident' and m.created_at > coalesce(t.resident_read_at, 'epoch'::timestamptz)`,
  )) as unknown as Array<{ n: number }>;
  return rows[0]?.n ?? 0;
}

// ── notices from errands ─────────────────────────────────────

/**
 * Posts a notice about a "collect a paid order" errand into the resident's chat with
 * the shop, so staff know a rider is coming and who to hand the order to.
 */
export async function postCollectNotice(
  order: Pick<Order, "id" | "code" | "vendorId" | "residentId" | "collectAs">,
  body: string,
  opts: { alert?: boolean } = {},
) {
  if (!order.vendorId || !order.collectAs) return;
  try {
    const thread = await ensureThread(order.vendorId, order.residentId);
    await addMessage(thread.id, "system", body, null, order.id);
    if (opts.alert !== false) {
      await notify(await staffIds(order.vendorId), { title: `Order #${order.code}`, body, url: `/shop/chats/${thread.id}`, tag: `pickup-${order.id}` });
    }
  } catch (err) {
    console.error("[shop-chat] notice failed", err);
  }
}

/** Errands heading to this shop right now: riders coming to collect, or runners coming to buy. */
export async function vendorPickups(user: User) {
  const vendorId = assertStaff(user);
  const rows = await db
    .select({ o: orders, runnerName: users.name })
    .from(orders)
    .leftJoin(users, eq(users.id, orders.runnerId))
    .where(and(eq(orders.vendorId, vendorId), inArray(orders.status, ["searching", "assigned", "to_vendor", "at_vendor"])))
    .orderBy(desc(orders.paidAt))
    .limit(30);
  return rows.map(({ o, runnerName }) => ({
    id: o.id,
    code: o.code,
    status: o.status,
    collectAs: o.collectAs,
    runner: runnerName ? firstName(runnerName) : null,
    at: (o.paidAt ?? o.createdAt).toISOString(),
  }));
}

export type VendorPickup = Awaited<ReturnType<typeof vendorPickups>>[number];
