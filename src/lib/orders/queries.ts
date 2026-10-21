import "server-only";
import { and, asc, count, desc, eq, gte, inArray, isNull, ne, sql, sum } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../db";
import {
  messages,
  orderEvents,
  orders,
  payouts,
  runnerEarnings,
  runnerProfiles,
  topups,
  users,
  vendors,
  type Order,
  type User,
} from "../db/schema";
import { UserError } from "../errors";
import { getSettings } from "../settings";
import { startOfDay, weekStart } from "../time";
import { RUNNER_ACTIVE_STATUSES, type OrderStatus } from "./status";

export type Viewer = Pick<User, "id" | "role">;

const firstName = (n: string | null | undefined) => (n ?? "").trim().split(/\s+/)[0] || "";

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

export type OrderView = Awaited<ReturnType<typeof buildOrderView>>;

async function buildOrderView(order: Order, viewer: Viewer) {
  const isAdmin = viewer.role === "admin";
  const isResident = viewer.id === order.residentId;
  const isRunner = viewer.id === order.runnerId;

  const runnerUser = alias(users, "runner_user");
  const [[resident], [runner], [vendor], events, [topup], [payout], [unread]] = await Promise.all([
    db.select().from(users).where(eq(users.id, order.residentId)),
    order.runnerId
      ? db
          .select({
            id: runnerUser.id,
            name: runnerUser.name,
            phone: runnerUser.phone,
            ratingSum: runnerProfiles.ratingSum,
            ratingCount: runnerProfiles.ratingCount,
            tag: runnerProfiles.tag,
          })
          .from(runnerUser)
          .leftJoin(runnerProfiles, eq(runnerProfiles.userId, runnerUser.id))
          .where(eq(runnerUser.id, order.runnerId))
      : Promise.resolve([]),
    order.vendorId ? db.select().from(vendors).where(eq(vendors.id, order.vendorId)) : Promise.resolve([]),
    db.select().from(orderEvents).where(eq(orderEvents.orderId, order.id)).orderBy(asc(orderEvents.createdAt)),
    db
      .select()
      .from(topups)
      .where(and(eq(topups.orderId, order.id), inArray(topups.status, ["pending", "approved", "declined"])))
      .orderBy(desc(topups.createdAt))
      .limit(1),
    db
      .select()
      .from(payouts)
      .where(and(eq(payouts.orderId, order.id), eq(payouts.type, "vendor")))
      .orderBy(desc(payouts.createdAt))
      .limit(1),
    db
      .select({ n: count() })
      .from(messages)
      .where(and(eq(messages.orderId, order.id), ne(messages.senderId, viewer.id), isNull(messages.readAt))),
  ]);

  const showCode = isResident && ["on_the_way", "arrived", "at_vendor"].includes(order.status);

  return {
    id: order.id,
    code: order.code,
    status: order.status as OrderStatus,
    category: order.category,
    kind: order.kind,
    vendorId: order.vendorId,
    vendorName: order.vendorName,
    vendorLocation: order.vendorLocation,
    vendorContacts: (isRunner || isAdmin) && vendor ? vendor.contacts : [],
    vendorIsPartner: !!vendor?.isPartner && !!vendor?.accountNumber,
    pickupFrom: order.pickupFrom,
    deliverTo: order.deliverTo,
    collectAs: order.collectAs,
    items: order.items,
    notes: order.notes,
    photoUrl: order.photoId ? `/api/uploads/${order.photoId}` : null,
    receiptUrl: order.receiptId ? `/api/uploads/${order.receiptId}` : null,
    drop: { block: order.dropBlock, house: order.dropHouse, street: order.dropStreet, landmark: order.dropLandmark },
    money: {
      budget: order.budget,
      serviceFee: order.serviceFee,
      discount: order.discount,
      total: order.total,
      walletApplied: order.walletApplied,
      topupTotal: order.topupTotal,
      actualCost: order.actualCost,
      changeRefunded: order.changeRefunded,
      loyaltyFree: order.loyaltyFree,
    },
    at: {
      created: iso(order.createdAt)!,
      paid: iso(order.paidAt),
      assigned: iso(order.assignedAt),
      accepted: iso(order.acceptedAt),
      atVendor: iso(order.atVendorAt),
      onTheWay: iso(order.onTheWayAt),
      arrived: iso(order.arrivedAt),
      delivered: iso(order.deliveredAt),
      cancelled: iso(order.cancelledAt),
      updated: iso(order.updatedAt)!,
    },
    resident: {
      id: resident.id,
      firstName: firstName(resident.name),
      name: isAdmin ? resident.name : null,
      phone: isAdmin ? resident.phone : null,
    },
    runner: runner
      ? {
          id: runner.id,
          name: runner.name ?? "Runner",
          firstName: firstName(runner.name),
          rating: runner.ratingCount ? (runner.ratingSum ?? 0) / runner.ratingCount : null,
          ratingCount: runner.ratingCount ?? 0,
          tag: runner.tag,
          phone: isAdmin ? runner.phone : null,
        }
      : null,
    deliveryCode: showCode || isAdmin ? order.deliveryCode : null,
    topup: topup
      ? { id: topup.id, amount: topup.amount, reason: topup.reason, status: topup.status, createdAt: iso(topup.createdAt)! }
      : null,
    vendorPayout: payout
      ? {
          id: payout.id,
          status: payout.status,
          amount: payout.amount,
          accountName: isResident ? null : payout.accountName,
          bankName: isResident ? null : payout.bankName,
          failureReason: isResident ? null : payout.failureReason,
        }
      : null,
    events: events
      .filter((e) => isAdmin || e.type !== "code_failed")
      .map((e) => ({ id: e.id, type: e.type, message: e.message, createdAt: iso(e.createdAt)! })),
    rating: order.rating ? { rating: order.rating, tags: order.ratingTags ?? [], comment: order.ratingComment } : null,
    cancelReason: order.cancelReason,
    unread: unread?.n ?? 0,
    viewerRole: isAdmin ? ("admin" as const) : isRunner ? ("runner" as const) : ("resident" as const),
  };
}

export async function getOrderForViewer(orderId: string, viewer: Viewer) {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) throw new UserError("Errand not found.");
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) throw new UserError("Errand not found.");
  const allowed = viewer.role === "admin" || order.residentId === viewer.id || order.runnerId === viewer.id;
  if (!allowed) throw new UserError("Errand not found.");
  return buildOrderView(order, viewer);
}

// ── resident ─────────────────────────────────────────────────

export type OrderCardData = {
  id: string;
  code: string;
  status: OrderStatus;
  category: string;
  kind: "buy" | "pickup";
  title: string;
  place: string | null;
  total: number;
  createdAt: string;
  runnerFirstName: string | null;
  rated: boolean;
};

function summarize(o: Order): string {
  if (o.collectAs) return o.notes?.slice(0, 60) || "Paid order pickup";
  const items = o.items ?? [];
  if (items.length) {
    const first = items[0];
    const rest = items.length - 1;
    return `${first.qty > 1 ? `${first.qty}× ` : ""}${first.name}${rest > 0 ? ` + ${rest} more` : ""}`;
  }
  return o.notes?.slice(0, 60) || "Errand";
}

export async function listResidentOrders(userId: string, limit = 50): Promise<OrderCardData[]> {
  const rows = await db
    .select({ o: orders, runnerName: users.name })
    .from(orders)
    .leftJoin(users, eq(users.id, orders.runnerId))
    .where(eq(orders.residentId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
  return rows.map(({ o, runnerName }) => ({
    id: o.id,
    code: o.code,
    status: o.status,
    category: o.category,
    kind: o.kind,
    title: summarize(o),
    place: o.kind === "pickup" ? o.pickupFrom || o.vendorName : o.vendorName,
    total: o.total + o.topupTotal,
    createdAt: o.createdAt.toISOString(),
    runnerFirstName: runnerName ? firstName(runnerName) : null,
    rated: !!o.rating,
  }));
}

// ── runner ───────────────────────────────────────────────────

export async function getRunnerState(runner: User) {
  const s = await getSettings();
  await db.update(runnerProfiles).set({ lastSeenAt: new Date() }).where(eq(runnerProfiles.userId, runner.id));
  const week = weekStart();
  const [[profile], [active], [today], [weekly], [unpaid], recent] = await Promise.all([
    db.select().from(runnerProfiles).where(eq(runnerProfiles.userId, runner.id)),
    db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.runnerId, runner.id), inArray(orders.status, RUNNER_ACTIVE_STATUSES)))
      .limit(1),
    db
      .select({ n: count(), amount: sum(runnerEarnings.amount) })
      .from(runnerEarnings)
      .where(and(eq(runnerEarnings.runnerId, runner.id), gte(runnerEarnings.createdAt, startOfDay()))),
    db
      .select({
        n: sql<number>`count(*) filter (where ${runnerEarnings.type} = 'commission')`.mapWith(Number),
        amount: sum(runnerEarnings.amount),
        bonus: sql<number>`count(*) filter (where ${runnerEarnings.type} = 'bonus')`.mapWith(Number),
      })
      .from(runnerEarnings)
      .where(and(eq(runnerEarnings.runnerId, runner.id), eq(runnerEarnings.weekStart, week))),
    db
      .select({ amount: sum(runnerEarnings.amount) })
      .from(runnerEarnings)
      .where(and(eq(runnerEarnings.runnerId, runner.id), isNull(runnerEarnings.payoutId))),
    db
      .select({ o: orders })
      .from(orders)
      .where(and(eq(orders.runnerId, runner.id), eq(orders.status, "delivered")))
      .orderBy(desc(orders.deliveredAt))
      .limit(5),
  ]);

  return {
    online: !!profile?.online,
    rating: profile?.ratingCount ? profile.ratingSum / profile.ratingCount : null,
    ratingCount: profile?.ratingCount ?? 0,
    hasBank: !!profile?.accountNumber,
    activeJob: active ? await getOrderForViewer(active.id, runner) : null,
    today: { jobs: Number(today?.n ?? 0), earned: Number(today?.amount ?? 0) },
    week: {
      jobs: weekly?.n ?? 0,
      earned: Number(weekly?.amount ?? 0),
      target: s.weeklyBonusTarget,
      bonus: s.weeklyBonusAmount,
      bonusEarned: (weekly?.bonus ?? 0) > 0,
    },
    unpaid: Number(unpaid?.amount ?? 0),
    commissionPct: s.runnerCommissionPct,
    recent: recent.map(({ o }) => ({
      id: o.id,
      code: o.code,
      category: o.category,
      title: summarize(o),
      block: o.dropBlock,
      deliveredAt: iso(o.deliveredAt),
      rating: o.rating,
    })),
  };
}

export type RunnerState = Awaited<ReturnType<typeof getRunnerState>>;

export async function getRunnerEarnings(runnerId: string) {
  const [rows, payoutRows] = await Promise.all([
    db
      .select({ e: runnerEarnings, code: orders.code, category: orders.category })
      .from(runnerEarnings)
      .leftJoin(orders, eq(orders.id, runnerEarnings.orderId))
      .where(eq(runnerEarnings.runnerId, runnerId))
      .orderBy(desc(runnerEarnings.createdAt))
      .limit(100),
    db
      .select()
      .from(payouts)
      .where(and(eq(payouts.userId, runnerId), eq(payouts.type, "runner")))
      .orderBy(desc(payouts.createdAt))
      .limit(20),
  ]);
  return {
    earnings: rows.map(({ e, code, category }) => ({
      id: e.id,
      type: e.type,
      amount: e.amount,
      code,
      category,
      note: e.note,
      paid: !!e.payoutId,
      createdAt: e.createdAt.toISOString(),
      weekStart: e.weekStart,
    })),
    payouts: payoutRows.map((p) => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      bankName: p.bankName,
      accountNumber: p.accountNumber ? `••••${p.accountNumber.slice(-4)}` : null,
      createdAt: p.createdAt.toISOString(),
    })),
  };
}

// ── messages ─────────────────────────────────────────────────

async function assertParticipant(orderId: string, viewer: Viewer) {
  const [o] = await db
    .select({ residentId: orders.residentId, runnerId: orders.runnerId, status: orders.status, deliveredAt: orders.deliveredAt })
    .from(orders)
    .where(eq(orders.id, orderId));
  if (!o) throw new UserError("Errand not found.");
  if (viewer.role !== "admin" && viewer.id !== o.residentId && viewer.id !== o.runnerId) throw new UserError("Errand not found.");
  return o;
}

export async function listMessages(orderId: string, viewer: Viewer) {
  const o = await assertParticipant(orderId, viewer);
  const rows = await db
    .select({ m: messages, name: users.name, role: users.role })
    .from(messages)
    .innerJoin(users, eq(users.id, messages.senderId))
    .where(eq(messages.orderId, orderId))
    .orderBy(asc(messages.createdAt))
    .limit(200);
  // Admins peeking at a resident↔runner chat shouldn't mark it read for them;
  // they only clear support requests (errands with no runner yet).
  const participant = viewer.id === o.residentId || viewer.id === o.runnerId;
  if (participant || !o.runnerId) {
    await db
      .update(messages)
      .set({ readAt: new Date() })
      .where(and(eq(messages.orderId, orderId), ne(messages.senderId, viewer.id), isNull(messages.readAt)));
  }
  return rows.map(({ m, name, role }) => ({
    id: m.id,
    body: m.body,
    mine: m.senderId === viewer.id,
    sender: role === "admin" ? "Support" : firstName(name) || (role === "runner" ? "Runner" : "Resident"),
    senderRole: role,
    createdAt: m.createdAt.toISOString(),
    read: !!m.readAt,
  }));
}

export type ChatMessage = Awaited<ReturnType<typeof listMessages>>[number];

export async function postMessage(orderId: string, viewer: Viewer, body: string) {
  const o = await assertParticipant(orderId, viewer);
  const text = body.trim().slice(0, 600);
  if (!text) throw new UserError("Type a message.");
  const closed = o.status === "cancelled" || (o.status === "delivered" && o.deliveredAt && Date.now() - o.deliveredAt.getTime() > 24 * 3600 * 1000);
  if (closed && viewer.role !== "admin") throw new UserError("This chat is closed.");
  const [m] = await db.insert(messages).values({ orderId, senderId: viewer.id, body: text }).returning();
  return { recipientIds: [o.residentId, o.runnerId].filter((id): id is string => !!id && id !== viewer.id), message: m };
}
