import "server-only";
import { and, asc, count, desc, eq, gt, inArray, isNotNull, lt, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db, type DbOrTx, type Tx } from "../db";
import {
  orderEvents,
  orders,
  payments,
  payouts,
  runnerEarnings,
  runnerProfiles,
  topups,
  users,
  vendors,
  type Order,
  type User,
} from "../db/schema";
import { getCategory, isCategoryId } from "../categories";
import { UserError } from "../errors";
import { deliveryCode, orderCode, reference } from "../ids";
import { naira } from "../money";
import { notify } from "../notify";
import { initializeTransaction, PaystackError, paystackLive, resolveAccount, verifyTransaction, verifyTransfer } from "../paystack";
import { applyTransferOutcome, reconcileProcessingPayouts, sendTransfer, settleMockPayouts } from "../payouts";
import { getSettings, isOpenNow } from "../settings";
import { computeQuote } from "./quote";
import { weekStart } from "../time";
import { walletCredit, walletDebit } from "../wallet";
import { RESIDENT_CANCELLABLE, RUNNER_ACTIVE_STATUSES, type OrderStatus } from "./status";

const ACCEPT_TIMEOUT_MS = 3 * 60 * 1000;
const RUNNER_STALE_MS = 10 * 60 * 1000;
const UNPAID_EXPIRY_MS = 2 * 60 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;
const DECLINE_COOLOFF_MS = 3 * 60 * 1000;

// ── helpers ──────────────────────────────────────────────────

async function addEvent(tx: DbOrTx, orderId: string, type: string, message: string, actorId?: string | null) {
  await tx.insert(orderEvents).values({ orderId, type, message, actorId: actorId ?? null });
}

async function lockOrder(tx: Tx, orderId: string): Promise<Order> {
  const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
  if (!order) throw new UserError("That errand doesn't exist.");
  return order;
}

function firstName(name: string | null | undefined) {
  return (name ?? "").trim().split(/\s+/)[0] || "Your runner";
}

function payEmail(user: Pick<User, "email" | "phone">) {
  return user.email || `${user.phone}@${process.env.PAYSTACK_EMAIL_DOMAIN || "customers.runam.ng"}`;
}

async function setStatus(tx: Tx, order: Order, status: OrderStatus, extra: Partial<typeof orders.$inferInsert> = {}) {
  await tx
    .update(orders)
    .set({ status, updatedAt: new Date(), ...extra })
    .where(eq(orders.id, order.id));
}

/** Amount the resident has actually put into this order so far (kobo). */
function amountPaidIn(order: Order) {
  return (order.paidAt ? order.total : order.walletApplied) + order.topupTotal;
}

// ── quote ────────────────────────────────────────────────────

export async function paidOrderCount(userId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(orders)
    .where(and(eq(orders.residentId, userId), isNotNull(orders.paidAt), sql`${orders.status} <> 'cancelled'`));
  return row?.n ?? 0;
}

// ── create ───────────────────────────────────────────────────

const itemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  qty: z.number().int().min(1).max(99),
  price: z.number().int().min(0).max(100_000_000).nullable().optional(),
  note: z.string().trim().max(200).nullable().optional(),
});

export const createOrderSchema = z.object({
  category: z.string().refine(isCategoryId, "Pick a category"),
  vendorId: z.string().uuid().nullable().optional(),
  vendorName: z.string().trim().max(80).nullable().optional(),
  vendorLocation: z.string().trim().max(120).nullable().optional(),
  pickupFrom: z.string().trim().max(160).nullable().optional(),
  deliverTo: z.string().trim().max(160).nullable().optional(),
  items: z.array(itemSchema).max(40),
  notes: z.string().trim().max(600).nullable().optional(),
  photoId: z.string().uuid().nullable().optional(),
  budget: z.number().int().min(0),
  useWallet: z.boolean(),
  drop: z.object({
    block: z.string().trim().min(1, "Add your block").max(40),
    house: z.string().trim().min(1, "Add your house number").max(40),
    street: z.string().trim().max(80).nullable().optional(),
    landmark: z.string().trim().max(120).nullable().optional(),
  }),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export async function createOrder(user: User, raw: CreateOrderInput): Promise<{ orderId: string; payUrl: string | null }> {
  const input = createOrderSchema.parse(raw);
  const s = await getSettings();
  if (!isOpenNow(s)) throw new UserError(`We're closed right now. Errands run ${s.openTime}–${s.closeTime}.`);

  const category = getCategory(input.category);
  const items = input.items.filter((i) => i.name.trim());

  if (category.kind === "buy") {
    if (!items.length && !input.notes) throw new UserError("Tell us what to get.");
    if (input.budget < 10000) throw new UserError("Set a budget of at least ₦100 for the items.");
  } else if (!input.pickupFrom && !items.length && !input.notes) {
    throw new UserError("Tell us what to pick up and from where.");
  }
  if (input.budget > s.maxBudget) throw new UserError(`The maximum budget per errand is ${naira(s.maxBudget)}.`);

  let vendor: typeof vendors.$inferSelect | undefined;
  if (input.vendorId) {
    [vendor] = await db.select().from(vendors).where(and(eq(vendors.id, input.vendorId), eq(vendors.isActive, true)));
    if (!vendor) throw new UserError("That shop is no longer available.");
  }

  const paidCount = await paidOrderCount(user.id);
  const quote = computeQuote(s, {
    category: category.id,
    budget: input.budget,
    walletBalance: user.walletBalance,
    useWallet: input.useWallet,
    paidCount,
  });

  const result = await db.transaction(async (tx) => {
    let created: Order | undefined;
    for (let attempt = 0; attempt < 4 && !created; attempt++) {
      const rows = await tx
        .insert(orders)
        .values({
          code: orderCode(),
          residentId: user.id,
          category: category.id,
          kind: category.kind,
          status: "awaiting_payment",
          vendorId: vendor?.id ?? null,
          vendorName: vendor?.name ?? input.vendorName ?? null,
          vendorLocation: vendor?.location ?? input.vendorLocation ?? null,
          pickupFrom: input.pickupFrom ?? null,
          deliverTo: input.deliverTo ?? null,
          items,
          notes: input.notes ?? null,
          photoId: input.photoId ?? null,
          dropBlock: input.drop.block,
          dropHouse: input.drop.house,
          dropStreet: input.drop.street ?? null,
          dropLandmark: input.drop.landmark ?? null,
          budget: input.budget,
          serviceFee: quote.serviceFee,
          discount: quote.discount,
          loyaltyFree: quote.loyaltyFree,
          total: quote.total,
          walletApplied: quote.walletApplied,
          deliveryCode: deliveryCode(),
        })
        .onConflictDoNothing({ target: orders.code })
        .returning();
      created = rows[0];
    }
    if (!created) throw new Error("Could not allocate an order code");

    await addEvent(tx, created.id, "created", "Errand placed", user.id);

    // Save the address on the profile so next time is one tap.
    await tx
      .update(users)
      .set({
        block: input.drop.block,
        house: input.drop.house,
        street: input.drop.street ?? null,
        landmark: input.drop.landmark ?? null,
      })
      .where(eq(users.id, user.id));

    if (quote.walletApplied > 0) {
      await walletDebit(tx, user.id, quote.walletApplied, "order_payment", { orderId: created.id, note: `Errand #${created.code}` });
    }

    if (quote.toPay === 0) {
      await setStatus(tx, created, "searching", { paidAt: new Date() });
      await tx.update(users).set({ lastOrderAt: new Date() }).where(eq(users.id, user.id));
      await addEvent(tx, created.id, "paid", "Paid from wallet");
      return { order: created, ref: null as string | null };
    }

    const ref = reference("pay");
    await tx.insert(payments).values({
      userId: user.id,
      orderId: created.id,
      purpose: "order",
      amount: quote.toPay,
      reference: ref,
    });
    return { order: created, ref };
  });

  if (!result.ref) {
    await dispatch();
    return { orderId: result.order.id, payUrl: null };
  }

  try {
    const { url } = await initializeTransaction({
      email: payEmail(user),
      amount: quote.toPay,
      reference: result.ref,
      metadata: { orderId: result.order.id, code: result.order.code, purpose: "order" },
    });
    return { orderId: result.order.id, payUrl: url };
  } catch (err) {
    await cancelOrderInternal(result.order.id, "Payment could not start", null, { allowed: ["awaiting_payment"] });
    console.error("[paystack] initialize failed", err);
    throw new UserError("We couldn't start the payment. Please try again in a moment.");
  }
}

/** Starts (or restarts) checkout for an order still awaiting payment. */
export async function resumePayment(user: User, orderId: string): Promise<string> {
  const [order] = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.residentId, user.id)));
  if (!order || order.status !== "awaiting_payment") throw new UserError("This errand doesn't need payment.");
  const toPay = order.total - order.walletApplied;
  const ref = reference("pay");
  await db.update(payments).set({ status: "abandoned" }).where(and(eq(payments.orderId, order.id), eq(payments.status, "pending"), eq(payments.purpose, "order")));
  await db.insert(payments).values({ userId: user.id, orderId: order.id, purpose: "order", amount: toPay, reference: ref });
  const { url } = await initializeTransaction({
    email: payEmail(user),
    amount: toPay,
    reference: ref,
    metadata: { orderId: order.id, code: order.code, purpose: "order" },
  });
  return url;
}

// ── payments ─────────────────────────────────────────────────

export async function markPaymentSuccess(ref: string, info: { amount: number; channel?: string | null; raw?: unknown }) {
  // Read which order this is for without a lock, so we can take locks in the
  // same order everywhere (order → payment → topup) and avoid deadlocks.
  const [peek] = await db.select({ orderId: payments.orderId }).from(payments).where(eq(payments.reference, ref));
  if (!peek) return null;

  const outcome = await db.transaction(async (tx) => {
    const order = peek.orderId ? await lockOrder(tx, peek.orderId) : null;
    const [payment] = await tx.select().from(payments).where(eq(payments.reference, ref)).for("update");
    if (!payment) return null;
    if (payment.status === "success") return { payment, fresh: false };
    if (info.amount < payment.amount) {
      await tx.update(payments).set({ status: "failed", raw: info.raw ?? null }).where(eq(payments.id, payment.id));
      console.error(`[payments] amount mismatch for ${ref}: got ${info.amount}, expected ${payment.amount}`);
      return null;
    }
    await tx
      .update(payments)
      .set({ status: "success", paidAt: new Date(), channel: info.channel ?? null, raw: info.raw ?? null })
      .where(eq(payments.id, payment.id));

    if (payment.purpose === "order" && order) {
      if (order.status === "awaiting_payment") {
        await setStatus(tx, order, "searching", { paidAt: new Date() });
        await tx.update(users).set({ lastOrderAt: new Date() }).where(eq(users.id, order.residentId));
        await addEvent(tx, order.id, "paid", `Payment received (${naira(payment.amount)})`);
      } else {
        // Paid after the order was cancelled/expired: keep the money safe in the wallet.
        await walletCredit(tx, payment.userId, payment.amount, "refund", { orderId: order.id, note: `Late payment for #${order.code}` });
        await addEvent(tx, order.id, "late_payment", "Payment arrived after cancellation — moved to wallet");
      }
    }

    if (payment.purpose === "topup" && payment.topupId && order) {
      const [t] = await tx.select().from(topups).where(eq(topups.id, payment.topupId)).for("update");
      if (t && (t.status === "pending" || t.status === "approved") && order.status === "at_vendor" && order.actualCost === null) {
        await tx.update(topups).set({ status: "paid", resolvedAt: new Date() }).where(eq(topups.id, t.id));
        await tx.update(orders).set({ topupTotal: order.topupTotal + t.amount, updatedAt: new Date() }).where(eq(orders.id, order.id));
        await addEvent(tx, order.id, "topup_paid", `Extra ${naira(t.amount)} paid`);
      } else {
        await walletCredit(tx, payment.userId, payment.amount, "refund", { orderId: order.id, note: "Top-up no longer needed" });
        await addEvent(tx, order.id, "late_payment", "Extra payment arrived late — moved to wallet");
      }
    }
    return { payment, fresh: true };
  });

  if (outcome?.fresh) {
    if (outcome.payment.purpose === "order") await dispatch();
    if (outcome.payment.purpose === "topup" && outcome.payment.orderId) {
      const [o] = await db.select({ runnerId: orders.runnerId, code: orders.code }).from(orders).where(eq(orders.id, outcome.payment.orderId));
      if (o?.runnerId) {
        await notify(o.runnerId, {
          title: "Extra money approved",
          body: `Order #${o.code}: the resident topped up. Confirm the purchase again.`,
          url: `/runner/jobs/${outcome.payment.orderId}`,
        });
      }
    }
  }
  return outcome?.payment ?? null;
}

const verifying = new Map<string, number>();

/** Asks Paystack about a pending payment (used when a webhook/redirect is missed). Throttled. */
export async function checkPendingPayment(ref: string) {
  if (!paystackLive()) return;
  const last = verifying.get(ref) ?? 0;
  if (Date.now() - last < 15_000) return;
  verifying.set(ref, Date.now());
  try {
    const tx = await verifyTransaction(ref);
    if (tx.status === "success" && tx.currency === "NGN") {
      await markPaymentSuccess(ref, { amount: tx.amount, channel: tx.channel, raw: tx.raw });
    } else if (tx.status === "failed" || tx.status === "abandoned") {
      await db.update(payments).set({ status: tx.status }).where(and(eq(payments.reference, ref), eq(payments.status, "pending")));
    }
  } catch {
    // Paystack returns an error for references that were never paid — ignore.
  }
}

// ── dispatch ─────────────────────────────────────────────────

async function tryAssign(orderId: string): Promise<"assigned" | "no-runners" | "skip"> {
  const res = await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update", { skipLocked: true });
    if (!order || order.status !== "searching") return { r: "skip" as const };

    const busy = tx
      .select({ id: orders.runnerId })
      .from(orders)
      .where(and(inArray(orders.status, RUNNER_ACTIVE_STATUSES), isNotNull(orders.runnerId)));

    const base = [
      eq(runnerProfiles.online, true),
      eq(users.isActive, true),
      eq(users.role, "runner"),
      gt(runnerProfiles.lastSeenAt, new Date(Date.now() - RUNNER_STALE_MS)),
      notInArray(runnerProfiles.userId, busy),
    ];
    const declined = order.declinedRunnerIds ?? [];
    const [runner] = await tx
      .select({ id: runnerProfiles.userId, name: users.name })
      .from(runnerProfiles)
      .innerJoin(users, eq(users.id, runnerProfiles.userId))
      .where(and(...base, declined.length ? notInArray(runnerProfiles.userId, declined) : undefined))
      .orderBy(sql`${runnerProfiles.lastAssignedAt} asc nulls first`)
      .limit(1)
      .for("update", { of: runnerProfiles, skipLocked: true });

    let picked = runner;
    if (!picked) {
      if (!declined.length) return { r: "no-runners" as const };
      // Only runners who passed on this errand are free. After a short cool-off,
      // offer it to them again rather than leaving it stuck in the queue forever.
      const coolingOff = Date.now() - order.updatedAt.getTime() < DECLINE_COOLOFF_MS;
      const [again] = await tx
        .select({ id: runnerProfiles.userId, name: users.name })
        .from(runnerProfiles)
        .innerJoin(users, eq(users.id, runnerProfiles.userId))
        .where(and(...base))
        .orderBy(sql`${runnerProfiles.lastAssignedAt} asc nulls first`)
        .limit(1)
        .for("update", { of: runnerProfiles, skipLocked: true });
      if (!again) return { r: "no-runners" as const };
      if (coolingOff) return { r: "skip" as const };
      picked = again;
    }
    const assignee = picked;

    const now = new Date();
    await setStatus(tx, order, "assigned", { runnerId: assignee.id, assignedAt: now, declinedRunnerIds: runner ? declined : [] });
    await tx.update(runnerProfiles).set({ lastAssignedAt: now }).where(eq(runnerProfiles.userId, assignee.id));
    await addEvent(tx, order.id, "assigned", `${firstName(assignee.name)} was assigned`);
    return { r: "assigned" as const, order, runner: assignee };
  });

  if (res.r === "assigned") {
    const { order, runner } = res;
    const where = order.kind === "pickup" ? order.pickupFrom || order.vendorName : order.vendorName;
    await notify(runner.id, {
      title: "New errand 🛵",
      body: `${getCategory(order.category).label}${where ? ` · ${where}` : ""} → Block ${order.dropBlock}. Tap to accept.`,
      url: `/runner/jobs/${order.id}`,
      sms: `New errand #${order.code}: ${getCategory(order.category).label} to Block ${order.dropBlock}. Open the app to accept.`,
      tag: `order-${order.id}`,
    });
    await notify(order.residentId, {
      title: `${firstName(runner.name)} is on your errand`,
      body: "Track it live in the app.",
      url: `/orders/${order.id}`,
      tag: `order-${order.id}`,
    });
  }
  return res.r;
}

/** Assigns waiting errands to free runners, oldest first. */
export async function dispatch() {
  const waiting = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.status, "searching"))
    .orderBy(asc(orders.paidAt))
    .limit(60);
  for (const w of waiting) {
    const r = await tryAssign(w.id);
    if (r === "no-runners") break;
  }
}

/** Runners who don't accept within the timeout are taken offline and the job moves on. */
async function releaseStaleAssignments() {
  const stale = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.status, "assigned"), lt(orders.assignedAt, new Date(Date.now() - ACCEPT_TIMEOUT_MS))));
  for (const s of stale) {
    const runnerId = await db.transaction(async (tx) => {
      const order = await lockOrder(tx, s.id);
      if (order.status !== "assigned" || !order.runnerId) return null;
      await setStatus(tx, order, "searching", {
        runnerId: null,
        assignedAt: null,
        declinedRunnerIds: [...(order.declinedRunnerIds ?? []), order.runnerId],
      });
      await tx.update(runnerProfiles).set({ online: false }).where(eq(runnerProfiles.userId, order.runnerId));
      await addEvent(tx, order.id, "timeout", "Runner didn't respond — finding another runner");
      return order.runnerId;
    });
    if (runnerId) {
      await notify(runnerId, {
        title: "You missed an errand",
        body: "We set you offline. Go online again when you're ready.",
        url: "/runner",
      });
    }
  }
}

async function expireStaleUnpaid() {
  const stale = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.status, "awaiting_payment"), lt(orders.createdAt, new Date(Date.now() - UNPAID_EXPIRY_MS))))
    .limit(20);
  for (const s of stale) {
    // Skips orders that got paid between the select and the lock.
    await cancelOrderInternal(s.id, "Payment not completed", null, { allowed: ["awaiting_payment"] }).catch(() => null);
  }
}

let lastTick = 0;

/**
 * Housekeeping that would normally live in a cron job. Called from the live
 * polling endpoints, so the system keeps moving whenever anyone has the app open.
 */
export async function tick() {
  await settleMockPayouts();
  if (Date.now() - lastTick < 4000) return;
  lastTick = Date.now();
  await Promise.allSettled([releaseStaleAssignments(), expireStaleUnpaid(), reconcileProcessingPayouts()]);
  await dispatch();
}

// ── cancel ───────────────────────────────────────────────────

type CancelOpts = { allowed?: OrderStatus[]; refund?: number };

async function cancelOrderInternal(orderId: string, reason: string, actorId: string | null, opts: CancelOpts = {}) {
  const res = await db.transaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    if (order.status === "cancelled" || order.status === "delivered") return null;
    if (opts.allowed && !opts.allowed.includes(order.status)) {
      throw new UserError("This errand has moved on and can't be cancelled from here.");
    }

    // Shop transfers for this errand: in-flight ones block the cancel, waiting ones are withdrawn.
    const shopPayouts = await tx
      .select()
      .from(payouts)
      .where(and(eq(payouts.orderId, order.id), eq(payouts.type, "vendor")))
      .for("update");
    if (shopPayouts.some((p) => p.status === "processing")) {
      throw new UserError("A transfer to the shop is in progress. Wait a moment for it to finish, then cancel.");
    }
    // Waiting or failed shop payments are withdrawn so nobody can approve/retry them later.
    for (const p of shopPayouts.filter((p) => ["pending_approval", "failed", "reversed"].includes(p.status))) {
      await tx
        .update(payouts)
        .set({ status: "rejected", failureReason: "Errand cancelled", completedAt: new Date() })
        .where(eq(payouts.id, p.id));
    }
    const shopPaid = shopPayouts.filter((p) => p.status === "success" || p.status === "manual").reduce((a, p) => a + p.amount, 0);
    const maxRefund = amountPaidIn(order);
    const refund = Math.min(opts.refund ?? Math.max(0, maxRefund - shopPaid), maxRefund);

    await setStatus(tx, order, "cancelled", { cancelledAt: new Date(), cancelReason: reason });
    await tx
      .update(payments)
      .set({ status: "abandoned" })
      .where(and(eq(payments.orderId, order.id), eq(payments.status, "pending")));
    await tx
      .update(topups)
      .set({ status: "declined", resolvedAt: new Date() })
      .where(and(eq(topups.orderId, order.id), inArray(topups.status, ["pending", "approved"])));
    if (refund > 0) {
      await walletCredit(tx, order.residentId, refund, "refund", { orderId: order.id, note: `Refund for #${order.code}` });
    }
    await addEvent(tx, order.id, "cancelled", `Cancelled: ${reason}${refund > 0 ? ` · ${naira(refund)} refunded to wallet` : ""}`, actorId);
    return { order, refund };
  });
  if (res?.order.runnerId) {
    await notify(res.order.runnerId, {
      title: "Errand cancelled",
      body: `Order #${res.order.code} was cancelled. Don't buy anything for it.`,
      url: "/runner",
    });
    await dispatch();
  }
  return res;
}

export async function cancelByResident(user: User, orderId: string, reason: string) {
  const [order] = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.residentId, user.id)));
  if (!order) throw new UserError("Errand not found.");
  if (!RESIDENT_CANCELLABLE.includes(order.status)) {
    throw new UserError("Your runner is already buying your items, so this can't be cancelled. Chat with them instead.");
  }
  return cancelOrderInternal(orderId, reason || "Cancelled by resident", user.id, { allowed: RESIDENT_CANCELLABLE });
}

/** `refund` is capped at what the resident paid in. Omit it to refund everything not already paid to the shop. */
export async function cancelByAdmin(admin: User, orderId: string, reason: string, refund?: number) {
  if (refund !== undefined && refund < 0) throw new UserError("Refund can't be negative.");
  return cancelOrderInternal(orderId, reason || "Cancelled by admin", admin.id, { refund });
}


// ── runner flow ──────────────────────────────────────────────

async function lockRunnerOrder(tx: Tx, runner: User, orderId: string, allowed: OrderStatus[]) {
  const order = await lockOrder(tx, orderId);
  if (order.runnerId !== runner.id) throw new UserError("This errand isn't assigned to you.");
  if (!allowed.includes(order.status)) throw new UserError("This errand has moved on — refresh to see the latest.");
  return order;
}

export async function setRunnerOnline(runner: User, online: boolean) {
  await db
    .update(runnerProfiles)
    .set({ online, lastSeenAt: new Date() })
    .where(eq(runnerProfiles.userId, runner.id));
  if (online) await dispatch();
}

export async function acceptJob(runner: User, orderId: string) {
  const order = await db.transaction(async (tx) => {
    const o = await lockRunnerOrder(tx, runner, orderId, ["assigned"]);
    await setStatus(tx, o, "to_vendor", { acceptedAt: new Date() });
    await addEvent(tx, o.id, "accepted", `${firstName(runner.name)} accepted and is heading out`, runner.id);
    return o;
  });
  await notify(order.residentId, {
    title: `${firstName(runner.name)} is on the way`,
    body: order.category === "gas" ? "Have your empty cylinder ready." : "Your errand has started.",
    url: `/orders/${order.id}`,
    tag: `order-${order.id}`,
  });
}

export async function declineJob(runner: User, orderId: string, reason: string) {
  await db.transaction(async (tx) => {
    const o = await lockRunnerOrder(tx, runner, orderId, ["assigned"]);
    await setStatus(tx, o, "searching", {
      runnerId: null,
      assignedAt: null,
      declinedRunnerIds: [...(o.declinedRunnerIds ?? []), runner.id],
    });
    await addEvent(tx, o.id, "declined", `Runner passed${reason ? ` (${reason})` : ""} — finding another runner`, runner.id);
  });
  await dispatch();
}

export async function arriveAtVendor(runner: User, orderId: string) {
  const order = await db.transaction(async (tx) => {
    const o = await lockRunnerOrder(tx, runner, orderId, ["to_vendor"]);
    await setStatus(tx, o, "at_vendor", { atVendorAt: new Date() });
    await addEvent(tx, o.id, "at_vendor", o.kind === "pickup" ? "Runner reached the pick-up point" : "Runner is at the shop", runner.id);
    return o;
  });
  return order;
}

export const purchaseSchema = z.object({
  actualCost: z.number().int().min(0),
  receiptId: z.string().uuid().nullable().optional(),
  account: z
    .object({ bankCode: z.string().min(2).max(10), bankName: z.string().max(80), accountNumber: z.string().regex(/^\d{10}$/) })
    .nullable()
    .optional(),
});

/**
 * Runner reports what the items cost. Either asks the resident for more money, or
 * creates the transfer to the shop (sent immediately for partner shops).
 */
export async function submitPurchase(runner: User, orderId: string, raw: z.infer<typeof purchaseSchema>) {
  const input = purchaseSchema.parse(raw);
  const s = await getSettings();

  let accountName: string | null = null;
  if (input.account) {
    try {
      accountName = (await resolveAccount(input.account.accountNumber, input.account.bankCode)).accountName;
    } catch {
      throw new UserError("We couldn't verify that account number. Check it with the shop.");
    }
  }

  const res = await db.transaction(async (tx) => {
    const order = await lockRunnerOrder(tx, runner, orderId, ["at_vendor"]);
    const available = order.budget + order.topupTotal;

    const shopPayouts = await tx
      .select()
      .from(payouts)
      .where(and(eq(payouts.orderId, order.id), eq(payouts.type, "vendor")))
      .for("update");
    if (shopPayouts.some((p) => ["pending_approval", "processing", "success", "manual"].includes(p.status))) {
      throw new UserError("The shop payment is already in progress.");
    }
    if (input.actualCost > 0 && !input.receiptId) throw new UserError("Add a photo of the receipt or the items first.");

    if (input.actualCost > available) {
      const extra = input.actualCost - available;
      await tx.update(topups).set({ status: "declined", resolvedAt: new Date() }).where(and(eq(topups.orderId, order.id), eq(topups.status, "pending")));
      const [t] = await tx.insert(topups).values({ orderId: order.id, amount: extra, reason: `Total came to ${naira(input.actualCost)}` }).returning();
      await addEvent(tx, order.id, "topup_requested", `Runner needs ${naira(extra)} more (total ${naira(input.actualCost)})`, runner.id);
      return { kind: "topup" as const, order, topup: t };
    }

    await tx
      .update(orders)
      .set({ actualCost: input.actualCost, receiptId: input.receiptId ?? order.receiptId, updatedAt: new Date() })
      .where(eq(orders.id, order.id));

    if (input.actualCost === 0) {
      await addEvent(tx, order.id, "purchase", "Nothing to pay at the shop", runner.id);
      return { kind: "none" as const, order };
    }

    let vendor: typeof vendors.$inferSelect | undefined;
    if (order.vendorId) [vendor] = await tx.select().from(vendors).where(eq(vendors.id, order.vendorId));

    const usePartner = !input.account && vendor?.accountNumber && vendor.bankCode;
    if (!usePartner && !input.account) throw new UserError("Enter the shop's bank details so we can pay them.");

    const auto = !!(usePartner && vendor?.isPartner && s.autoPayPartnerVendors);
    // Earlier failed attempts are superseded by this one, so they can never be retried as well.
    const superseded = shopPayouts.filter((p) => p.status === "failed" || p.status === "reversed").map((p) => p.id);
    if (superseded.length) {
      await tx
        .update(payouts)
        .set({ status: "rejected", failureReason: "Replaced by a new payment attempt" })
        .where(inArray(payouts.id, superseded));
    }
    const [p] = await tx
      .insert(payouts)
      .values({
        type: "vendor",
        orderId: order.id,
        vendorId: vendor?.id ?? null,
        userId: runner.id,
        amount: input.actualCost,
        bankCode: usePartner ? vendor!.bankCode : input.account!.bankCode,
        bankName: usePartner ? vendor!.bankName : input.account!.bankName,
        accountNumber: usePartner ? vendor!.accountNumber : input.account!.accountNumber,
        accountName: usePartner ? vendor!.accountName : accountName,
        recipientCode: usePartner ? vendor!.recipientCode : null,
        reference: reference("po"),
        status: auto ? "processing" : "pending_approval",
        note: `#${order.code} ${order.vendorName ?? "shop"}`.slice(0, 100),
      })
      .returning();
    await addEvent(
      tx,
      order.id,
      "purchase",
      auto ? `Items cost ${naira(input.actualCost)} — paying the shop now` : `Items cost ${naira(input.actualCost)} — waiting for admin to approve the transfer`,
      runner.id,
    );
    return { kind: "payout" as const, order, payout: p, auto };
  });

  if (res.kind === "topup") {
    await notify(res.order.residentId, {
      title: "Your runner needs a bit more",
      body: `The total came to ${naira(input.actualCost)}. Approve the extra ${naira(res.topup.amount)} in the app.`,
      url: `/orders/${res.order.id}`,
      tag: `order-${res.order.id}`,
    });
  }
  if (res.kind === "payout") {
    if (res.auto) await sendTransfer(res.payout.id);
    else {
      const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
      await notify(
        admins.map((a) => a.id),
        { title: "Shop payment needs approval", body: `${naira(res.payout.amount)} for #${res.order.code}`, url: "/admin/payouts" },
      );
    }
  }
  return res.kind;
}

async function vendorPaymentSettled(tx: DbOrTx, order: Order) {
  const needsPayment = (order.actualCost ?? 0) > 0;
  if (!needsPayment) return true;
  const [p] = await tx
    .select({ id: payouts.id })
    .from(payouts)
    .where(and(eq(payouts.orderId, order.id), eq(payouts.type, "vendor"), inArray(payouts.status, ["success", "manual"])));
  return !!p;
}

export async function startDelivery(runner: User, orderId: string) {
  const order = await db.transaction(async (tx) => {
    const o = await lockRunnerOrder(tx, runner, orderId, ["at_vendor"]);
    const hasMoney = o.budget + o.topupTotal > 0;
    if (hasMoney && o.actualCost === null) throw new UserError("Confirm what you paid at the shop first.");
    if (!(await vendorPaymentSettled(tx, o))) throw new UserError("Wait for the shop payment to go through first.");
    await setStatus(tx, o, "on_the_way", { onTheWayAt: new Date(), actualCost: o.actualCost ?? 0 });
    await addEvent(tx, o.id, "on_the_way", "On the way to you", runner.id);
    return o;
  });
  await notify(order.residentId, {
    title: "On the way 🛵",
    body: `${firstName(runner.name)} is bringing your errand.`,
    url: `/orders/${order.id}`,
    tag: `order-${order.id}`,
  });
}

export async function markArrived(runner: User, orderId: string) {
  const order = await db.transaction(async (tx) => {
    const o = await lockRunnerOrder(tx, runner, orderId, ["on_the_way"]);
    await setStatus(tx, o, "arrived", { arrivedAt: new Date() });
    await addEvent(tx, o.id, "arrived", "Runner is at the door", runner.id);
    return o;
  });
  await notify(order.residentId, {
    title: `${firstName(runner.name)} is at your door`,
    body: `Your delivery code is ${order.deliveryCode}. Only share it once you have everything.`,
    url: `/orders/${order.id}`,
    sms: `Your runner is at the door with errand #${order.code}. Delivery code: ${order.deliveryCode}. Only share it once you have everything.`,
    tag: `order-${order.id}`,
  });
}

async function finishDelivery(tx: Tx, order: Order, actorId: string, how: string) {
  const s = await getSettings();
  const now = new Date();
  const actual = order.actualCost ?? 0;
  const change = Math.max(0, order.budget + order.topupTotal - actual);

  await setStatus(tx, order, "delivered", { deliveredAt: now, changeRefunded: change });
  await addEvent(tx, order.id, "delivered", how, actorId);

  if (change > 0) {
    await walletCredit(tx, order.residentId, change, "change", { orderId: order.id, note: `Change from #${order.code}` });
  }
  await tx
    .update(users)
    .set({ deliveredCount: sql`${users.deliveredCount} + 1`, lastOrderAt: now })
    .where(eq(users.id, order.residentId));

  if (order.runnerId) {
    const week = weekStart(now);
    const commission = Math.round((order.serviceFee * s.runnerCommissionPct) / 100);
    if (commission > 0) {
      await tx
        .insert(runnerEarnings)
        .values({ runnerId: order.runnerId, orderId: order.id, type: "commission", amount: commission, weekStart: week })
        .onConflictDoNothing();
    }
    if (s.weeklyBonusTarget > 0 && s.weeklyBonusAmount > 0) {
      const [done] = await tx
        .select({ n: count() })
        .from(runnerEarnings)
        .where(and(eq(runnerEarnings.runnerId, order.runnerId), eq(runnerEarnings.weekStart, week), eq(runnerEarnings.type, "commission")));
      if ((done?.n ?? 0) >= s.weeklyBonusTarget) {
        await tx
          .insert(runnerEarnings)
          .values({
            runnerId: order.runnerId,
            type: "bonus",
            amount: s.weeklyBonusAmount,
            weekStart: week,
            note: `Weekly bonus: ${s.weeklyBonusTarget} errands`,
          })
          .onConflictDoNothing();
      }
    }
  }
  return change;
}

export async function completeDelivery(runner: User, orderId: string, code: string) {
  const clean = code.replace(/\D/g, "");
  const res = await db.transaction(async (tx) => {
    const o = await lockRunnerOrder(tx, runner, orderId, ["on_the_way", "arrived"]);
    const [fails] = await tx
      .select({ n: count() })
      .from(orderEvents)
      .where(and(eq(orderEvents.orderId, o.id), eq(orderEvents.type, "code_failed")));
    if ((fails?.n ?? 0) >= MAX_CODE_ATTEMPTS) {
      throw new UserError("Too many wrong codes. Ask the admin to confirm this delivery.");
    }
    if (clean !== o.deliveryCode) {
      await addEvent(tx, o.id, "code_failed", "Wrong delivery code entered", runner.id);
      return { ok: false as const, left: MAX_CODE_ATTEMPTS - (fails?.n ?? 0) - 1 };
    }
    const change = await finishDelivery(tx, o, runner.id, "Delivered — code confirmed");
    return { ok: true as const, order: o, change };
  });

  if (!res.ok) {
    throw new UserError(res.left > 0 ? `That code is wrong. ${res.left} ${res.left === 1 ? "try" : "tries"} left.` : "Too many wrong codes. Ask the admin to confirm this delivery.");
  }
  await notify(res.order.residentId, {
    title: "Delivered ✓",
    body: res.change > 0 ? `${naira(res.change)} change is in your wallet. Rate your runner?` : "Thanks! Rate your runner?",
    url: `/orders/${res.order.id}`,
    tag: `order-${res.order.id}`,
  });
  await dispatch();
}

export async function adminMarkDelivered(admin: User, orderId: string) {
  const order = await db.transaction(async (tx) => {
    const o = await lockOrder(tx, orderId);
    if (!["at_vendor", "on_the_way", "arrived"].includes(o.status)) throw new UserError("Only errands that are on the way can be marked delivered.");
    if (!(await vendorPaymentSettled(tx, o))) throw new UserError("The shop hasn't been paid yet.");
    await finishDelivery(tx, o, admin.id, "Marked delivered by admin");
    return o;
  });
  await notify(order.residentId, { title: "Delivered ✓", body: `Errand #${order.code} is complete.`, url: `/orders/${order.id}` });
  await dispatch();
}

// ── top-ups ──────────────────────────────────────────────────

export async function respondToTopup(user: User, topupId: string, approve: boolean): Promise<{ payUrl: string | null }> {
  const [t0] = await db.select().from(topups).where(eq(topups.id, topupId));
  if (!t0) throw new UserError("Request not found.");

  /** Locks order → topup and re-checks everything the decision depends on. */
  async function lockFresh(tx: Tx) {
    const o = await lockOrder(tx, t0.orderId);
    const [t] = await tx.select().from(topups).where(eq(topups.id, topupId)).for("update");
    if (o.residentId !== user.id || !t) throw new UserError("Request not found.");
    // "approved" means a card checkout was started but not finished — they can still change their mind.
    if (t.status !== "pending" && t.status !== "approved") throw new UserError("You've already answered this.");
    if (o.status !== "at_vendor" || o.actualCost !== null) throw new UserError("This errand has moved on.");
    return { o, t };
  }

  if (!approve) {
    const { o } = await db.transaction(async (tx) => {
      const locked = await lockFresh(tx);
      await tx.update(topups).set({ status: "declined", resolvedAt: new Date() }).where(eq(topups.id, topupId));
      await tx
        .update(payments)
        .set({ status: "abandoned" })
        .where(and(eq(payments.topupId, topupId), eq(payments.status, "pending")));
      await addEvent(tx, locked.o.id, "topup_declined", "You declined the extra amount — runner will adjust", user.id);
      return locked;
    });
    if (o.runnerId) {
      await notify(o.runnerId, {
        title: "Extra money declined",
        body: `Order #${o.code}: stay within ${naira(o.budget + o.topupTotal)}. Remove something or chat with the resident.`,
        url: `/runner/jobs/${o.id}`,
      });
    }
    return { payUrl: null };
  }

  // Pay from the wallet when it covers it (all checks repeated under the lock).
  const paidFromWallet = await db.transaction(async (tx) => {
    const { o, t } = await lockFresh(tx);
    const [u] = await tx.select({ walletBalance: users.walletBalance }).from(users).where(eq(users.id, user.id));
    if ((u?.walletBalance ?? 0) < t.amount) return null;
    await walletDebit(tx, user.id, t.amount, "order_payment", { orderId: o.id, note: `Extra for #${o.code}` });
    await tx.update(topups).set({ status: "paid", resolvedAt: new Date() }).where(eq(topups.id, t.id));
    await tx
      .update(payments)
      .set({ status: "abandoned" })
      .where(and(eq(payments.topupId, t.id), eq(payments.status, "pending")));
    await tx.update(orders).set({ topupTotal: o.topupTotal + t.amount, updatedAt: new Date() }).where(eq(orders.id, o.id));
    await addEvent(tx, o.id, "topup_paid", `Extra ${naira(t.amount)} paid from wallet`, user.id);
    return o;
  });
  if (paidFromWallet) {
    if (paidFromWallet.runnerId) {
      await notify(paidFromWallet.runnerId, {
        title: "Extra money approved",
        body: `Order #${paidFromWallet.code}: confirm the purchase again.`,
        url: `/runner/jobs/${paidFromWallet.id}`,
      });
    }
    return { payUrl: null };
  }

  // Otherwise start (or restart) a card/transfer checkout.
  const ref = reference("pay");
  const { o, t } = await db.transaction(async (tx) => {
    const locked = await lockFresh(tx);
    await tx
      .update(payments)
      .set({ status: "abandoned" })
      .where(and(eq(payments.topupId, locked.t.id), eq(payments.status, "pending")));
    await tx.update(topups).set({ status: "approved" }).where(eq(topups.id, locked.t.id));
    await tx.insert(payments).values({ userId: user.id, orderId: locked.o.id, topupId: locked.t.id, purpose: "topup", amount: locked.t.amount, reference: ref });
    return locked;
  });
  try {
    const { url } = await initializeTransaction({
      email: payEmail(user),
      amount: t.amount,
      reference: ref,
      metadata: { orderId: o.id, topupId: t.id, purpose: "topup" },
    });
    return { payUrl: url };
  } catch (err) {
    console.error("[paystack] topup initialize failed", err);
    await db.update(topups).set({ status: "pending" }).where(and(eq(topups.id, t.id), eq(topups.status, "approved")));
    await db.update(payments).set({ status: "abandoned" }).where(eq(payments.reference, ref));
    throw new UserError("We couldn't start the payment. Please try again.");
  }
}

// ── rating ───────────────────────────────────────────────────

export const ratingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  tags: z.array(z.string().max(40)).max(6),
  comment: z.string().trim().max(400).nullable().optional(),
});

export async function rateOrder(user: User, orderId: string, raw: z.infer<typeof ratingSchema>) {
  const input = ratingSchema.parse(raw);
  await db.transaction(async (tx) => {
    const o = await lockOrder(tx, orderId);
    if (o.residentId !== user.id) throw new UserError("Errand not found.");
    if (o.status !== "delivered") throw new UserError("You can rate once the errand is delivered.");
    if (o.rating) throw new UserError("You've already rated this errand.");
    await tx
      .update(orders)
      .set({ rating: input.rating, ratingTags: input.tags, ratingComment: input.comment ?? null })
      .where(eq(orders.id, o.id));
    if (o.runnerId) {
      await tx
        .update(runnerProfiles)
        .set({ ratingSum: sql`${runnerProfiles.ratingSum} + ${input.rating}`, ratingCount: sql`${runnerProfiles.ratingCount} + 1` })
        .where(eq(runnerProfiles.userId, o.runnerId));
    }
  });
}

// ── admin ────────────────────────────────────────────────────

export async function adminReassign(admin: User, orderId: string, runnerId: string | null) {
  const previous = await db.transaction(async (tx) => {
    const o = await lockOrder(tx, orderId);
    if (!["searching", "assigned", "to_vendor"].includes(o.status)) {
      throw new UserError("Errands can only be reassigned before the runner reaches the shop.");
    }
    if (runnerId) {
      const [busy] = await tx
        .select({ id: orders.id })
        .from(orders)
        .where(and(eq(orders.runnerId, runnerId), inArray(orders.status, RUNNER_ACTIVE_STATUSES)));
      if (busy) throw new UserError("That runner is already on an errand.");
      const [r] = await tx
        .select({ name: users.name })
        .from(users)
        .where(and(eq(users.id, runnerId), eq(users.role, "runner"), eq(users.isActive, true)));
      if (!r) throw new UserError("Runner not found.");
      await setStatus(tx, o, "assigned", { runnerId, assignedAt: new Date(), acceptedAt: null });
      await tx.update(runnerProfiles).set({ lastAssignedAt: new Date() }).where(eq(runnerProfiles.userId, runnerId));
      await addEvent(tx, o.id, "reassigned", `Admin assigned ${firstName(r.name)}`, admin.id);
    } else {
      await setStatus(tx, o, "searching", { runnerId: null, assignedAt: null, acceptedAt: null });
      await addEvent(tx, o.id, "reassigned", "Admin released the errand for another runner", admin.id);
    }
    return o;
  });
  if (previous.runnerId && previous.runnerId !== runnerId) {
    await notify(previous.runnerId, { title: "Errand reassigned", body: `Order #${previous.code} was moved to another runner.`, url: "/runner" });
  }
  if (runnerId) {
    await notify(runnerId, { title: "New errand 🛵", body: `Order #${previous.code} — tap to accept.`, url: `/runner/jobs/${orderId}` });
  } else {
    await dispatch();
  }
}

/** Locks the payout (and its errand first, for vendor payouts — same lock order as cancel). */
async function lockPayout(tx: Tx, payoutId: string) {
  const [peek] = await tx.select({ orderId: payouts.orderId }).from(payouts).where(eq(payouts.id, payoutId));
  const order = peek?.orderId ? await lockOrder(tx, peek.orderId) : null;
  const [row] = await tx.select().from(payouts).where(eq(payouts.id, payoutId)).for("update");
  if (!row) throw new UserError("Payout not found.");
  return { row, order };
}

/** A shop may only be paid once per errand, and never for a cancelled errand. */
async function assertShopPayable(tx: Tx, row: typeof payouts.$inferSelect, order: Order | null) {
  if (row.type !== "vendor") return;
  if (!order || order.status === "cancelled") throw new UserError("This errand was cancelled — decline this payout instead.");
  const [sibling] = await tx
    .select({ id: payouts.id })
    .from(payouts)
    .where(
      and(
        eq(payouts.orderId, order.id),
        eq(payouts.type, "vendor"),
        sql`${payouts.id} <> ${row.id}`,
        inArray(payouts.status, ["pending_approval", "processing", "success", "manual"]),
      ),
    );
  if (sibling) throw new UserError("Another payment to this shop is already in progress or done.");
}

export async function approvePayout(admin: User, payoutId: string) {
  const p = await db.transaction(async (tx) => {
    const { row, order } = await lockPayout(tx, payoutId);
    if (row.status !== "pending_approval") throw new UserError("This payout isn't waiting for approval.");
    await assertShopPayable(tx, row, order);
    await tx.update(payouts).set({ status: "processing", approvedBy: admin.id }).where(eq(payouts.id, row.id));
    return row;
  });
  await sendTransfer(p.id);
}

export async function rejectPayout(admin: User, payoutId: string, note: string) {
  const p = await db.transaction(async (tx) => {
    const { row } = await lockPayout(tx, payoutId);
    if (row.status !== "pending_approval") throw new UserError("This payout isn't waiting for approval.");
    await tx
      .update(payouts)
      .set({ status: "rejected", approvedBy: admin.id, failureReason: note || "Rejected", completedAt: new Date() })
      .where(eq(payouts.id, row.id));
    if (row.type === "withdrawal" && row.userId) {
      await walletCredit(tx, row.userId, row.amount, "withdrawal_reversal", { payoutId: row.id, note: "Withdrawal declined" });
    }
    if (row.type === "vendor" && row.orderId) {
      await tx.update(orders).set({ actualCost: null }).where(and(eq(orders.id, row.orderId), eq(orders.status, "at_vendor")));
      await addEvent(tx, row.orderId, "vendor_payment_rejected", `Admin declined the shop transfer${note ? `: ${note}` : ""}`, admin.id);
    }
    return row;
  });
  if (p.type === "vendor" && p.userId) {
    await notify(p.userId, { title: "Shop payment declined", body: note || "Check the details and submit again.", url: `/runner/jobs/${p.orderId}` });
  }
}

/**
 * Admin paid this outside Paystack (cash, POS, own banking app).
 * Not allowed while a transfer is in flight, or for failed runner payouts /
 * withdrawals (their money was already released back), to avoid paying twice.
 */
export async function markPayoutManual(admin: User, payoutId: string) {
  const p = await db.transaction(async (tx) => {
    const { row, order } = await lockPayout(tx, payoutId);
    const ok = row.status === "pending_approval" || (row.type === "vendor" && (row.status === "failed" || row.status === "reversed"));
    if (!ok) {
      throw new UserError(
        row.status === "processing" ? "A transfer is still in flight — wait for it to finish first." : "This payout can't be marked as paid.",
      );
    }
    await assertShopPayable(tx, row, order);
    await tx.update(payouts).set({ status: "manual", approvedBy: admin.id, completedAt: new Date() }).where(eq(payouts.id, row.id));
    if (row.type === "vendor" && row.orderId) {
      await addEvent(tx, row.orderId, "vendor_paid", `Shop paid ${naira(row.amount)} (recorded by admin)`, admin.id);
    }
    return row;
  });
  if (p.type === "vendor" && p.userId) {
    await notify(p.userId, { title: "Shop has been paid ✓", body: "Collect the items and head out.", url: `/runner/jobs/${p.orderId}` });
  }
}

export async function retryPayout(admin: User, payoutId: string) {
  const [existing] = await db.select().from(payouts).where(eq(payouts.id, payoutId));
  if (!existing) throw new UserError("Payout not found.");
  // Runner earnings are released when a payout fails, so a fresh "Pay" picks them up instead.
  if (existing.type === "runner") throw new UserError("Use “Pay now” on the runner instead.");
  // Failed withdrawals are refunded to the wallet, so the resident simply requests again.
  if (existing.type === "withdrawal") throw new UserError("The money went back to their wallet — they can request again.");

  // Before sending again under a new reference, make sure the old transfer really didn't go out.
  if (paystackLive()) {
    let status: Awaited<ReturnType<typeof verifyTransfer>> | "unknown" = "unknown";
    try {
      status = await verifyTransfer(existing.reference);
    } catch (err) {
      if (err instanceof PaystackError && err.definite) status = "failed"; // Paystack never saw it
    }
    if (status === "success") {
      await db
        .update(payouts)
        .set({ status: "success", completedAt: new Date(), failureReason: null })
        .where(and(eq(payouts.id, existing.id), inArray(payouts.status, ["failed", "reversed"])));
      if (existing.orderId) await addEvent(db, existing.orderId, "vendor_paid", `Shop paid ${naira(existing.amount)} (confirmed with Paystack)`, admin.id);
      throw new UserError("Paystack shows this transfer actually went through — marked as paid.");
    }
    if (status === "pending" || status === "unknown") throw new UserError("Paystack still shows this transfer as pending. Try again in a few minutes.");
  }

  const p = await db.transaction(async (tx) => {
    const { row, order } = await lockPayout(tx, payoutId);
    if (row.status !== "failed" && row.status !== "reversed") throw new UserError("Only failed payouts can be retried.");
    await assertShopPayable(tx, row, order);
    const [updated] = await tx
      .update(payouts)
      .set({ status: "processing", reference: reference("po"), transferCode: null, failureReason: null, approvedBy: admin.id, completedAt: null })
      .where(eq(payouts.id, row.id))
      .returning();
    return updated;
  });
  await sendTransfer(p.id);
}

export async function payRunner(admin: User, runnerId: string) {
  const res = await db.transaction(async (tx) => {
    const [profile] = await tx.select().from(runnerProfiles).where(eq(runnerProfiles.userId, runnerId)).for("update");
    const [runner] = await tx.select().from(users).where(eq(users.id, runnerId));
    if (!profile || !runner) throw new UserError("Runner not found.");
    if (!profile.accountNumber || !profile.bankCode) throw new UserError("Add the runner's bank account first.");
    const unpaid = await tx
      .select({ id: runnerEarnings.id, amount: runnerEarnings.amount })
      .from(runnerEarnings)
      .where(and(eq(runnerEarnings.runnerId, runnerId), sql`${runnerEarnings.payoutId} is null`))
      .for("update");
    const amount = unpaid.reduce((a, e) => a + e.amount, 0);
    if (amount <= 0) throw new UserError("Nothing to pay right now.");
    const [p] = await tx
      .insert(payouts)
      .values({
        type: "runner",
        userId: runnerId,
        amount,
        bankCode: profile.bankCode,
        bankName: profile.bankName,
        accountNumber: profile.accountNumber,
        accountName: profile.accountName,
        recipientCode: profile.recipientCode,
        reference: reference("po"),
        status: "processing",
        approvedBy: admin.id,
        note: `Earnings for ${firstName(runner.name)}`,
      })
      .returning();
    await tx
      .update(runnerEarnings)
      .set({ payoutId: p.id })
      .where(inArray(runnerEarnings.id, unpaid.map((u) => u.id)));
    return p;
  });
  await sendTransfer(res.id);
  await notify(runnerId, { title: "Payout on the way 💸", body: `${naira(res.amount)} is being sent to your bank.`, url: "/runner/earnings" });
  return res;
}

export async function adminCreditWallet(admin: User, userId: string, amount: number, note: string) {
  if (amount <= 0) throw new UserError("Enter an amount.");
  await db.transaction(async (tx) => {
    await walletCredit(tx, userId, amount, "admin_credit", { note: note || "Credit from Runam" });
  });
  await notify(userId, { title: "Wallet credited", body: `${naira(amount)} was added to your wallet.`, url: "/wallet" });
}

// ── withdrawals ──────────────────────────────────────────────

export const withdrawalSchema = z.object({
  amount: z.number().int().min(10000),
  bankCode: z.string().min(2).max(10),
  bankName: z.string().max(80),
  accountNumber: z.string().regex(/^\d{10}$/, "Account number must be 10 digits"),
});

export async function requestWithdrawal(user: User, raw: z.infer<typeof withdrawalSchema>) {
  const input = withdrawalSchema.parse(raw);
  let accountName: string;
  try {
    accountName = (await resolveAccount(input.accountNumber, input.bankCode)).accountName;
  } catch {
    throw new UserError("We couldn't verify that account. Check the number and bank.");
  }
  await db.transaction(async (tx) => {
    const [p] = await tx
      .insert(payouts)
      .values({
        type: "withdrawal",
        userId: user.id,
        amount: input.amount,
        bankCode: input.bankCode,
        bankName: input.bankName,
        accountNumber: input.accountNumber,
        accountName,
        reference: reference("po"),
        status: "pending_approval",
        note: "Wallet withdrawal",
      })
      .returning();
    await walletDebit(tx, user.id, input.amount, "withdrawal", { payoutId: p.id, note: `To ${accountName}` });
  });
  const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
  await notify(admins.map((a) => a.id), { title: "Withdrawal request", body: `${naira(input.amount)} to ${accountName}`, url: "/admin/payouts" });
  return { accountName };
}

export { applyTransferOutcome };

export async function latestPendingPayment(orderId: string) {
  const [p] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.orderId, orderId), eq(payments.status, "pending")))
    .orderBy(desc(payments.createdAt))
    .limit(1);
  return p ?? null;
}
