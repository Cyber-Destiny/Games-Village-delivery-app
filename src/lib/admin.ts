import "server-only";
import { and, asc, count, desc, eq, gte, ilike, inArray, isNull, lt, ne, or, sql, sum } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "./db";
import {
  messages,
  orders,
  payouts,
  runnerEarnings,
  runnerProfiles,
  topups,
  users,
  vendorItems,
  vendors,
  type OrderStatus,
} from "./db/schema";
import { ACTIVE_STATUSES, RUNNER_ACTIVE_STATUSES } from "./orders/status";
import { lagosDateKey, startOfDay, weekStart } from "./time";

const runnerUser = alias(users, "runner_user");
const first = (n: string | null | undefined) => (n ?? "").trim().split(/\s+/)[0] || "";

function summarize(items: Array<{ name: string; qty: number }>, notes: string | null) {
  if (items.length) return `${items[0].qty > 1 ? `${items[0].qty}× ` : ""}${items[0].name}${items.length > 1 ? ` + ${items.length - 1} more` : ""}`;
  return notes?.slice(0, 60) || "Errand";
}

// ── overview ─────────────────────────────────────────────────

export async function getOverview() {
  const today = startOfDay();
  const since14 = new Date(today.getTime() - 13 * 86400000);
  const yesterday = new Date(today.getTime() - 86400000);

  const [[t], [y], series, live, [pendingPayouts], [failedPayouts], [runnersOnline], [runnersTotal], topShops, [pendingTopups], unread] = await Promise.all([
    db
      .select({
        delivered: count(),
        gmv: sum(orders.actualCost),
        revenue: sql<number>`coalesce(sum(${orders.serviceFee} - ${orders.discount}), 0)`.mapWith(Number),
        avgMins: sql<number>`coalesce(avg(extract(epoch from (${orders.deliveredAt} - ${orders.paidAt})) / 60), 0)`.mapWith(Number),
      })
      .from(orders)
      .where(and(eq(orders.status, "delivered"), gte(orders.deliveredAt, today))),
    db
      .select({ delivered: count(), revenue: sql<number>`coalesce(sum(${orders.serviceFee} - ${orders.discount}), 0)`.mapWith(Number) })
      .from(orders)
      .where(and(eq(orders.status, "delivered"), gte(orders.deliveredAt, yesterday), lt(orders.deliveredAt, today))),
    db
      .select({ deliveredAt: orders.deliveredAt, fee: orders.serviceFee, discount: orders.discount })
      .from(orders)
      .where(and(eq(orders.status, "delivered"), gte(orders.deliveredAt, since14))),
    db
      .select({ o: orders, runnerName: runnerUser.name, residentName: users.name })
      .from(orders)
      .innerJoin(users, eq(users.id, orders.residentId))
      .leftJoin(runnerUser, eq(runnerUser.id, orders.runnerId))
      .where(inArray(orders.status, ACTIVE_STATUSES))
      .orderBy(asc(orders.paidAt)),
    db.select({ n: count() }).from(payouts).where(eq(payouts.status, "pending_approval")),
    db
      .select({ n: count() })
      .from(payouts)
      .where(and(eq(payouts.type, "vendor"), inArray(payouts.status, ["failed", "reversed"]))),
    db
      .select({ n: count() })
      .from(runnerProfiles)
      .innerJoin(users, eq(users.id, runnerProfiles.userId))
      .where(and(eq(runnerProfiles.online, true), eq(users.isActive, true), gte(runnerProfiles.lastSeenAt, new Date(Date.now() - 10 * 60000)))),
    db.select({ n: count() }).from(users).where(and(eq(users.role, "runner"), eq(users.isActive, true))),
    db
      .select({ name: orders.vendorName, n: count() })
      .from(orders)
      .where(and(eq(orders.status, "delivered"), gte(orders.deliveredAt, new Date(Date.now() - 7 * 86400000))))
      .groupBy(orders.vendorName)
      .orderBy(desc(count()))
      .limit(5),
    db.select({ n: count() }).from(topups).where(eq(topups.status, "pending")),
    db
      .select({ orderId: messages.orderId, n: count() })
      .from(messages)
      .innerJoin(users, eq(users.id, messages.senderId))
      .innerJoin(orders, eq(orders.id, messages.orderId))
      .where(
        and(
          isNull(messages.readAt),
          eq(users.role, "resident"),
          isNull(orders.runnerId), // support requests: nobody but admin will read these
          gte(messages.createdAt, new Date(Date.now() - 3 * 86400000)),
        ),
      )
      .groupBy(messages.orderId),
  ]);

  const days: Array<{ key: string; label: string; delivered: number; revenue: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000 + 3600000);
    const key = lagosDateKey(d);
    days.push({
      key,
      label: d.toLocaleDateString("en-NG", { day: "numeric", month: "short", timeZone: "Africa/Lagos" }),
      delivered: 0,
      revenue: 0,
    });
  }
  for (const r of series) {
    if (!r.deliveredAt) continue;
    const day = days.find((d) => d.key === lagosDateKey(r.deliveredAt!));
    if (day) {
      day.delivered += 1;
      day.revenue += r.fee - r.discount;
    }
  }

  const now = Date.now();
  const liveRows = live.map(({ o, runnerName, residentName }) => {
    const age = Math.round((now - (o.paidAt ?? o.createdAt).getTime()) / 60000);
    let alert: string | null = null;
    if (o.status === "searching" && age >= 5) alert = `Waiting ${age} min for a runner`;
    if (o.status === "assigned" && o.assignedAt && now - o.assignedAt.getTime() > 2 * 60000) alert = "Runner hasn't accepted";
    return {
      id: o.id,
      code: o.code,
      status: o.status as OrderStatus,
      category: o.category,
      title: summarize(o.items, o.notes),
      place: o.kind === "pickup" ? o.pickupFrom : o.vendorName,
      block: o.dropBlock,
      runner: runnerName ? first(runnerName) : null,
      resident: first(residentName),
      ageMins: age,
      alert,
      unread: unread.find((u) => u.orderId === o.id)?.n ?? 0,
    };
  });

  return {
    today: {
      delivered: t?.delivered ?? 0,
      gmv: Number(t?.gmv ?? 0),
      revenue: t?.revenue ?? 0,
      avgMins: Math.round(t?.avgMins ?? 0),
    },
    yesterday: { delivered: y?.delivered ?? 0, revenue: y?.revenue ?? 0 },
    days,
    live: liveRows,
    alerts: {
      pendingPayouts: pendingPayouts?.n ?? 0,
      failedPayouts: failedPayouts?.n ?? 0,
      pendingTopups: pendingTopups?.n ?? 0,
      stuck: liveRows.filter((l) => l.alert).length,
      unreadChats: unread.reduce((a, u) => a + u.n, 0),
    },
    runners: { online: runnersOnline?.n ?? 0, total: runnersTotal?.n ?? 0 },
    topShops: topShops.map((s) => ({ name: s.name ?? "Any shop", n: s.n })),
  };
}

export type Overview = Awaited<ReturnType<typeof getOverview>>;

export async function getAdminBadges() {
  const [[p], [stuck]] = await Promise.all([
    db.select({ n: count() }).from(payouts).where(eq(payouts.status, "pending_approval")),
    db
      .select({ n: count() })
      .from(orders)
      .where(or(and(eq(orders.status, "searching"), lt(orders.paidAt, new Date(Date.now() - 5 * 60000))), and(eq(orders.status, "assigned"), lt(orders.assignedAt, new Date(Date.now() - 2 * 60000))))),
  ]);
  return { payouts: p?.n ?? 0, orders: stuck?.n ?? 0 };
}

// ── orders ───────────────────────────────────────────────────

export type OrderFilter = "active" | "attention" | "delivered" | "cancelled" | "all";

export async function listAdminOrders(filter: OrderFilter, q: string) {
  const where = [];
  if (filter === "active") where.push(inArray(orders.status, [...ACTIVE_STATUSES]));
  if (filter === "delivered") where.push(eq(orders.status, "delivered"));
  if (filter === "cancelled") where.push(eq(orders.status, "cancelled"));
  if (filter === "attention") {
    where.push(
      or(
        and(eq(orders.status, "searching"), lt(orders.paidAt, new Date(Date.now() - 5 * 60000))),
        and(eq(orders.status, "assigned"), lt(orders.assignedAt, new Date(Date.now() - 2 * 60000))),
        eq(orders.status, "awaiting_payment"),
      ),
    );
  }
  if (q.trim()) {
    const like = `%${q.trim()}%`;
    where.push(or(ilike(orders.code, like), ilike(users.name, like), ilike(users.phone, like), ilike(orders.vendorName, like), ilike(orders.dropBlock, like)));
  }
  const rows = await db
    .select({ o: orders, residentName: users.name, residentPhone: users.phone, runnerName: runnerUser.name })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.residentId))
    .leftJoin(runnerUser, eq(runnerUser.id, orders.runnerId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(150);
  return rows.map(({ o, residentName, residentPhone, runnerName }) => ({
    id: o.id,
    code: o.code,
    status: o.status as OrderStatus,
    category: o.category,
    title: summarize(o.items, o.notes),
    place: o.kind === "pickup" ? o.pickupFrom : o.vendorName,
    resident: residentName ?? residentPhone,
    block: o.dropBlock,
    house: o.dropHouse,
    runner: runnerName ? first(runnerName) : null,
    total: o.total + o.topupTotal,
    fee: o.serviceFee - o.discount,
    rating: o.rating,
    createdAt: o.createdAt.toISOString(),
  }));
}

export type AdminOrderRow = Awaited<ReturnType<typeof listAdminOrders>>[number];

export async function freeRunners() {
  const busy = db
    .select({ id: orders.runnerId })
    .from(orders)
    .where(and(inArray(orders.status, RUNNER_ACTIVE_STATUSES), sql`${orders.runnerId} is not null`));
  const rows = await db
    .select({ id: users.id, name: users.name, online: runnerProfiles.online, lastSeen: runnerProfiles.lastSeenAt })
    .from(users)
    .innerJoin(runnerProfiles, eq(runnerProfiles.userId, users.id))
    .where(and(eq(users.role, "runner"), eq(users.isActive, true), sql`${users.id} not in ${busy}`))
    .orderBy(desc(runnerProfiles.online), asc(users.name));
  return rows.map((r) => ({ id: r.id, name: r.name ?? "Runner", online: r.online && !!r.lastSeen && Date.now() - r.lastSeen.getTime() < 10 * 60000 }));
}

// ── runners ──────────────────────────────────────────────────

export async function getRunners() {
  const week = weekStart();
  const [rows, active, weekly, unpaid] = await Promise.all([
    db
      .select({ u: users, p: runnerProfiles })
      .from(users)
      .innerJoin(runnerProfiles, eq(runnerProfiles.userId, users.id))
      .where(eq(users.role, "runner"))
      .orderBy(desc(users.isActive), desc(runnerProfiles.online), asc(users.name)),
    db
      .select({ runnerId: orders.runnerId, id: orders.id, code: orders.code, status: orders.status })
      .from(orders)
      .where(inArray(orders.status, RUNNER_ACTIVE_STATUSES)),
    db
      .select({ runnerId: runnerEarnings.runnerId, n: count() })
      .from(runnerEarnings)
      .where(and(eq(runnerEarnings.weekStart, week), eq(runnerEarnings.type, "commission")))
      .groupBy(runnerEarnings.runnerId),
    db
      .select({ runnerId: runnerEarnings.runnerId, amount: sum(runnerEarnings.amount) })
      .from(runnerEarnings)
      .where(isNull(runnerEarnings.payoutId))
      .groupBy(runnerEarnings.runnerId),
  ]);
  return rows.map(({ u, p }) => {
    const job = active.find((a) => a.runnerId === u.id);
    const fresh = !!p.lastSeenAt && Date.now() - p.lastSeenAt.getTime() < 10 * 60000;
    return {
      id: u.id,
      name: u.name ?? "Runner",
      phone: u.phone,
      isActive: u.isActive,
      online: p.online && fresh,
      lastSeen: p.lastSeenAt?.toISOString() ?? null,
      tag: p.tag,
      nin: p.nin,
      guarantorName: p.guarantorName,
      guarantorPhone: p.guarantorPhone,
      bank: p.accountNumber ? { bankName: p.bankName, accountNumber: p.accountNumber, accountName: p.accountName, bankCode: p.bankCode } : null,
      rating: p.ratingCount ? p.ratingSum / p.ratingCount : null,
      ratingCount: p.ratingCount,
      job: job ? { id: job.id, code: job.code, status: job.status as OrderStatus } : null,
      weekJobs: weekly.find((w) => w.runnerId === u.id)?.n ?? 0,
      unpaid: Number(unpaid.find((x) => x.runnerId === u.id)?.amount ?? 0),
    };
  });
}

export type AdminRunner = Awaited<ReturnType<typeof getRunners>>[number];

// ── vendors ──────────────────────────────────────────────────

export async function getVendorsAdmin() {
  const since = new Date(Date.now() - 30 * 86400000);
  const [rows, items, stats] = await Promise.all([
    db.select().from(vendors).orderBy(desc(vendors.isActive), asc(vendors.sort), asc(vendors.name)),
    db.select().from(vendorItems).orderBy(asc(vendorItems.sort), asc(vendorItems.name)),
    db
      .select({ vendorId: orders.vendorId, n: count(), spend: sum(orders.actualCost) })
      .from(orders)
      .where(and(eq(orders.status, "delivered"), gte(orders.deliveredAt, since)))
      .groupBy(orders.vendorId),
  ]);
  return rows.map((v) => ({
    ...v,
    createdAt: v.createdAt.toISOString(),
    items: items.filter((i) => i.vendorId === v.id).map((i) => ({ ...i, createdAt: i.createdAt.toISOString() })),
    orders30: stats.find((s) => s.vendorId === v.id)?.n ?? 0,
    spend30: Number(stats.find((s) => s.vendorId === v.id)?.spend ?? 0),
  }));
}

export type AdminVendor = Awaited<ReturnType<typeof getVendorsAdmin>>[number];

// ── payouts ──────────────────────────────────────────────────

export async function getPayoutsAdmin() {
  const [pending, recent, runners] = await Promise.all([
    db
      .select({ p: payouts, code: orders.code, who: users.name })
      .from(payouts)
      .leftJoin(orders, eq(orders.id, payouts.orderId))
      .leftJoin(users, eq(users.id, payouts.userId))
      // Failed runner payouts and withdrawals resolve themselves (earnings released / wallet refunded).
      .where(or(eq(payouts.status, "pending_approval"), and(eq(payouts.type, "vendor"), inArray(payouts.status, ["failed", "reversed"]))))
      .orderBy(asc(payouts.createdAt)),
    db
      .select({ p: payouts, code: orders.code, who: users.name })
      .from(payouts)
      .leftJoin(orders, eq(orders.id, payouts.orderId))
      .leftJoin(users, eq(users.id, payouts.userId))
      .orderBy(desc(payouts.createdAt))
      .limit(60),
    getRunners(),
  ]);
  const map = ({ p, code, who }: { p: typeof payouts.$inferSelect; code: string | null; who: string | null }) => ({
    id: p.id,
    type: p.type,
    status: p.status,
    amount: p.amount,
    accountName: p.accountName,
    bankName: p.bankName,
    accountNumber: p.accountNumber,
    note: p.note,
    failureReason: p.failureReason,
    orderId: p.orderId,
    code,
    who: who ? first(who) : null,
    createdAt: p.createdAt.toISOString(),
    completedAt: p.completedAt?.toISOString() ?? null,
  });
  return {
    needsAction: pending.map(map),
    history: recent.map(map),
    runners: runners.filter((r) => r.unpaid > 0 || r.isActive).map((r) => ({ id: r.id, name: r.name, unpaid: r.unpaid, bank: r.bank })),
  };
}

export type AdminPayout = Awaited<ReturnType<typeof getPayoutsAdmin>>["history"][number];

// ── residents ────────────────────────────────────────────────

export async function getResidentsAdmin(q: string) {
  const where = [eq(users.role, "resident")];
  if (q.trim()) {
    const like = `%${q.trim()}%`;
    where.push(or(ilike(users.name, like), ilike(users.phone, like), ilike(users.block, like))!);
  }
  const rows = await db
    .select({
      u: users,
      // Raw, fully-qualified SQL: drizzle renders single-table columns unqualified,
      // which would make "id" resolve to orders.id inside the subquery.
      orders: sql<number>`(select count(*) from orders o where o.resident_id = "users"."id" and o.status = 'delivered')`.mapWith(Number),
      spend: sql<number>`(select coalesce(sum(o.total + o.topup_total), 0) from orders o where o.resident_id = "users"."id" and o.status = 'delivered')`.mapWith(Number),
    })
    .from(users)
    .where(and(...where))
    .orderBy(sql`${users.lastOrderAt} desc nulls last`, desc(users.createdAt))
    .limit(300);
  const now = Date.now();
  return rows.map(({ u, orders: n, spend }) => {
    const idle = u.lastOrderAt ? Math.floor((now - u.lastOrderAt.getTime()) / 86400000) : null;
    return {
      id: u.id,
      name: u.name ?? "—",
      phone: u.phone,
      block: u.block,
      house: u.house,
      wallet: u.walletBalance,
      orders: n,
      spend,
      lastOrderAt: u.lastOrderAt?.toISOString() ?? null,
      idleDays: idle,
      // Regulars who suddenly stop are often being served off-app.
      quiet: n >= 3 && idle !== null && idle >= 10,
      isActive: u.isActive,
      joinedAt: u.createdAt.toISOString(),
    };
  });
}

export type AdminResident = Awaited<ReturnType<typeof getResidentsAdmin>>[number];
