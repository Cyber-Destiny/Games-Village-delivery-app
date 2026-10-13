import "server-only";
import { and, asc, eq, inArray, isNull, lt, lte } from "drizzle-orm";
import { db, type DbOrTx } from "./db";
import { orderEvents, orders, payouts, runnerEarnings, runnerProfiles, users, vendors, type Payout } from "./db/schema";
import { reference } from "./ids";
import { naira } from "./money";
import { notify } from "./notify";
import { createRecipient, initiateTransfer, PaystackError, paystackLive, verifyTransfer } from "./paystack";
import { walletCredit } from "./wallet";

const MOCK_SETTLE_MS = 3500;

async function addEvent(tx: DbOrTx, orderId: string, type: string, message: string, actorId?: string | null) {
  await tx.insert(orderEvents).values({ orderId, type, message, actorId: actorId ?? null });
}

/** Makes sure the payout has a Paystack recipient code, creating (and caching) one if needed. */
async function ensureRecipient(p: Payout): Promise<string> {
  if (p.recipientCode) return p.recipientCode;
  if (!p.accountNumber || !p.bankCode) throw new Error("Payout has no bank account");
  const code = await createRecipient({
    name: p.accountName || "Recipient",
    accountNumber: p.accountNumber,
    bankCode: p.bankCode,
  });
  await db.update(payouts).set({ recipientCode: code }).where(eq(payouts.id, p.id));
  // Cache on the vendor / runner so future payouts skip this step.
  if (p.type === "vendor" && p.vendorId) {
    await db
      .update(vendors)
      .set({ recipientCode: code })
      .where(and(eq(vendors.id, p.vendorId), eq(vendors.accountNumber, p.accountNumber)));
  }
  if (p.type === "runner" && p.userId) {
    await db
      .update(runnerProfiles)
      .set({ recipientCode: code })
      .where(and(eq(runnerProfiles.userId, p.userId), eq(runnerProfiles.accountNumber, p.accountNumber)));
  }
  return code;
}

/**
 * Sends the transfer for a payout that is in `processing` and hasn't been sent yet.
 * Safe to call more than once — only the first caller claims the payout.
 */
export async function sendTransfer(payoutId: string): Promise<void> {
  const [claimed] = await db
    .update(payouts)
    .set({ transferCode: "sending" })
    .where(and(eq(payouts.id, payoutId), eq(payouts.status, "processing"), isNull(payouts.transferCode)))
    .returning();
  if (!claimed) return;

  let result: Awaited<ReturnType<typeof initiateTransfer>>;
  try {
    const recipient = await ensureRecipient(claimed);
    result = await initiateTransfer({
      amount: claimed.amount,
      recipientCode: recipient,
      reference: claimed.reference,
      reason: claimed.note ?? "Runam payout",
    });
  } catch (err) {
    result = { status: "failed", transferCode: null, message: err instanceof Error ? err.message : "Transfer failed" };
  }

  await db
    .update(payouts)
    .set({
      transferCode: result.transferCode ?? "none",
      mockSettleAt: paystackLive() ? null : new Date(Date.now() + MOCK_SETTLE_MS),
    })
    .where(eq(payouts.id, payoutId));

  if (result.status === "success") await applyTransferOutcome(claimed.reference, "success");
  if (result.status === "failed") await applyTransferOutcome(claimed.reference, "failed", result.message);
}

export async function applyTransferOutcome(ref: string, outcome: "success" | "failed" | "reversed", reason?: string) {
  const changed = await db.transaction(async (tx) => {
    const [p] = await tx.select().from(payouts).where(eq(payouts.reference, ref)).for("update");
    if (!p) return null;

    if (outcome === "success") {
      if (p.status === "failed" || p.status === "reversed" || p.status === "rejected") {
        // Money went out after we'd given up on it. Don't silently ignore it.
        console.error(`[payouts] transfer ${ref} succeeded but payout ${p.id} is ${p.status}`);
        return { p, outcome: "late_success" as const };
      }
      if (p.status !== "processing") return null;
      await tx.update(payouts).set({ status: "success", completedAt: new Date() }).where(eq(payouts.id, p.id));
      if (p.type === "vendor" && p.orderId) {
        await addEvent(tx, p.orderId, "vendor_paid", `Shop paid ${naira(p.amount)} by transfer`);
      }
      return { p, outcome };
    }

    if (!["processing", "success"].includes(p.status)) return null;
    await tx
      .update(payouts)
      .set({ status: outcome, failureReason: reason ?? null, completedAt: new Date() })
      .where(eq(payouts.id, p.id));
    if (p.type === "runner") {
      await tx.update(runnerEarnings).set({ payoutId: null }).where(eq(runnerEarnings.payoutId, p.id));
    }
    if (p.type === "withdrawal" && p.userId) {
      await walletCredit(tx, p.userId, p.amount, "withdrawal_reversal", { payoutId: p.id, note: "Withdrawal failed — money returned" });
    }
    if (p.type === "vendor" && p.orderId) {
      await addEvent(tx, p.orderId, "vendor_payment_failed", `Transfer to the shop failed${reason ? `: ${reason}` : ""}. Admin has been alerted.`);
    }
    return { p, outcome };
  });

  if (changed?.outcome === "late_success") {
    const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
    await notify(
      admins.map((a) => a.id),
      {
        title: "Check this payout",
        body: `A ${naira(changed.p.amount)} transfer to ${changed.p.accountName ?? "a recipient"} went through after it was marked ${changed.p.status}.`,
        url: "/admin/payouts",
      },
    );
    return changed;
  }

  if (changed?.p.type === "vendor" && changed.p.orderId) {
    const [o] = await db.select({ runnerId: orders.runnerId, code: orders.code }).from(orders).where(eq(orders.id, changed.p.orderId));
    if (o?.runnerId) {
      await notify(o.runnerId, {
        title: changed.outcome === "success" ? "Shop has been paid ✓" : "Shop payment failed",
        body: changed.outcome === "success" ? `Order #${o.code}: collect the items and head out.` : `Order #${o.code}: we're sorting it out. Hold on.`,
        url: `/runner/jobs/${changed.p.orderId}`,
        tag: `order-${changed.p.orderId}`,
      });
    }
  }
  return changed;
}

/** Demo mode: settle transfers a few seconds after they were "sent". */
export async function settleMockPayouts() {
  if (paystackLive()) return;
  const due = await db
    .select({ reference: payouts.reference })
    .from(payouts)
    .where(and(eq(payouts.status, "processing"), lte(payouts.mockSettleAt, new Date())));
  for (const d of due) await applyTransferOutcome(d.reference, "success");
}

let lastReconcile = 0;

/** Live mode: catch transfers whose webhook we missed. Throttled. */
export async function reconcileProcessingPayouts() {
  if (!paystackLive() || Date.now() - lastReconcile < 30_000) return;
  lastReconcile = Date.now();
  const stale = await db
    .select({ reference: payouts.reference, createdAt: payouts.createdAt })
    .from(payouts)
    .where(and(eq(payouts.status, "processing"), lt(payouts.createdAt, new Date(Date.now() - 60_000))))
    .orderBy(asc(payouts.createdAt))
    .limit(10);
  for (const s of stale) {
    try {
      const status = await verifyTransfer(s.reference);
      if (status !== "pending") await applyTransferOutcome(s.reference, status);
    } catch (err) {
      // Paystack has no record of it (e.g. we crashed before sending): after a while, call it failed.
      if (err instanceof PaystackError && err.definite && Date.now() - s.createdAt.getTime() > 10 * 60_000) {
        await applyTransferOutcome(s.reference, "failed", "Transfer never reached Paystack");
      }
    }
  }
}

export async function newPayoutReference() {
  return reference("po");
}

export const PAYOUT_SETTLED = ["success", "manual"] as const;

export async function payoutsForOrder(orderId: string) {
  return db.select().from(payouts).where(and(eq(payouts.orderId, orderId), inArray(payouts.type, ["vendor"])));
}
