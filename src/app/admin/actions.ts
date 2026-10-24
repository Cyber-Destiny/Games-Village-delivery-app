"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertRole } from "@/lib/auth/dal";
import { isCategoryId } from "@/lib/categories";
import { db, type Tx } from "@/lib/db";
import { orders, runnerProfiles, users, vendorItems, vendors, type VendorContact } from "@/lib/db/schema";
import { attempt, UserError } from "@/lib/errors";
import {
  adminCreditWallet,
  adminMarkDelivered,
  adminReassign,
  approvePayout,
  cancelByAdmin,
  confirmShopPayment,
  markPayoutManual,
  payRunner,
  rejectPayout,
  retryPayout,
} from "@/lib/orders/service";
import { resolveAccount, transfersEnabled } from "@/lib/paystack";
import { isAllowedShopImage } from "@/lib/photos";
import { normalizeEmail } from "@/lib/email-address";
import { normalizePhone } from "@/lib/phone";
import { saveSettings as persistSettings } from "@/lib/settings";
import { assertPhoneFree } from "@/lib/users";
import type { Settings } from "@/lib/settings-shared";

const admin = () => assertRole("admin");
const done = (...paths: string[]) => paths.forEach((p) => revalidatePath(p));

// ── orders ───────────────────────────────────────────────────

export async function reassignOrder(orderId: string, runnerId: string | null) {
  return attempt(async () => {
    await adminReassign(await admin(), orderId, runnerId);
    done("/admin", `/admin/orders/${orderId}`);
  });
}

export async function cancelOrder(orderId: string, reason: string, refund: number) {
  return attempt(async () => {
    await cancelByAdmin(await admin(), orderId, reason, refund);
    done("/admin", `/admin/orders/${orderId}`);
  });
}

/** After phoning the shop: their payment arrived, so send a rider. */
export async function confirmForShop(orderId: string) {
  return attempt(async () => {
    await confirmShopPayment(await admin(), orderId, true);
    done("/admin", `/admin/orders/${orderId}`);
  });
}

export async function markDelivered(orderId: string) {
  return attempt(async () => {
    await adminMarkDelivered(await admin(), orderId);
    done("/admin", `/admin/orders/${orderId}`);
  });
}

// ── payouts ──────────────────────────────────────────────────

export async function approve(payoutId: string) {
  return attempt(async () => {
    await approvePayout(await admin(), payoutId);
    done("/admin/payouts", "/admin");
  });
}

export async function reject(payoutId: string, note: string) {
  return attempt(async () => {
    await rejectPayout(await admin(), payoutId, note);
    done("/admin/payouts", "/admin");
  });
}

export async function markManual(payoutId: string) {
  return attempt(async () => {
    await markPayoutManual(await admin(), payoutId);
    done("/admin/payouts", "/admin");
  });
}

export async function retry(payoutId: string) {
  return attempt(async () => {
    await retryPayout(await admin(), payoutId);
    done("/admin/payouts");
  });
}

export async function payRunnerNow(runnerId: string) {
  return attempt(async () => {
    const p = await payRunner(await admin(), runnerId);
    done("/admin/payouts", "/admin/runners");
    return { amount: p.amount };
  });
}

export async function creditWallet(userId: string, amount: number, note: string) {
  return attempt(async () => {
    await adminCreditWallet(await admin(), userId, amount, note);
    done("/admin/residents");
  });
}

// ── runners ──────────────────────────────────────────────────

const runnerSchema = z.object({
  id: z.string().uuid().nullable(),
  name: z.string().trim().min(2, "Enter the runner's name").max(60),
  email: z.string(),
  phone: z.string(),
  tag: z.string().trim().max(20),
  nin: z.string().trim().max(20),
  guarantorName: z.string().trim().max(60),
  guarantorPhone: z.string().trim().max(20),
  bank: z.object({ bankCode: z.string(), bankName: z.string(), accountNumber: z.string(), accountName: z.string().max(100).nullable().optional() }).nullable(),
});

export async function saveRunner(input: z.infer<typeof runnerSchema>) {
  return attempt(async () => {
    await admin();
    const parsed = runnerSchema.safeParse(input);
    if (!parsed.success) throw new UserError(parsed.error.issues[0]?.message ?? "Check the details.");
    const v = parsed.data;
    const email = normalizeEmail(v.email);
    if (!email) throw new UserError("Enter the runner's email. It's how they sign in.");
    const phone = normalizePhone(v.phone);
    if (!phone) throw new UserError("Enter a valid Nigerian phone number.");
    if (v.nin && !/^\d{11}$/.test(v.nin)) throw new UserError("NIN must be 11 digits.");

    let bank: { bankCode: string; bankName: string; accountNumber: string; accountName: string } | null = null;
    if (v.bank?.accountNumber) {
      const { accountName } = await resolveAccount(v.bank.accountNumber, v.bank.bankCode, v.bank.accountName).catch((err) => {
        throw err instanceof UserError ? err : new UserError("We couldn't verify the bank account.");
      });
      bank = { bankCode: v.bank.bankCode, bankName: v.bank.bankName, accountNumber: v.bank.accountNumber, accountName };
    }

    await db.transaction(async (tx) => {
      let userId = v.id;
      if (!userId) {
        const [existing] = await tx.select().from(users).where(eq(users.email, email));
        if (existing && existing.role === "admin") throw new UserError("That email belongs to an admin.");
        if (existing?.vendorId) throw new UserError("That email belongs to a shop's staff. Remove them from the shop first.");
        await assertPhoneFree(phone, existing?.id ?? null, tx);
        if (existing) {
          await tx.update(users).set({ role: "runner", name: v.name, phone, isActive: true }).where(eq(users.id, existing.id));
          userId = existing.id;
        } else {
          const [u] = await tx.insert(users).values({ email, phone, name: v.name, role: "runner" }).returning();
          userId = u.id;
        }
      } else {
        const [clash] = await tx.select({ id: users.id }).from(users).where(and(eq(users.email, email), sql`${users.id} <> ${userId}`));
        if (clash) throw new UserError("Another account already uses that email.");
        await assertPhoneFree(phone, userId, tx);
        const [before] = await tx.select({ email: users.email }).from(users).where(eq(users.id, userId));
        // A new sign-in email signs them out everywhere.
        await tx
          .update(users)
          .set({ name: v.name, email, phone, ...(before?.email !== email ? { sessionVersion: sql`${users.sessionVersion} + 1` } : {}) })
          .where(eq(users.id, userId));
      }
      const profile = {
        tag: v.tag || null,
        nin: v.nin || null,
        guarantorName: v.guarantorName || null,
        guarantorPhone: v.guarantorPhone ? normalizePhone(v.guarantorPhone) ?? v.guarantorPhone : null,
        ...(bank ? { ...bank, recipientCode: null } : {}),
      };
      await tx
        .insert(runnerProfiles)
        .values({ userId: userId!, ...profile })
        .onConflictDoUpdate({ target: runnerProfiles.userId, set: profile });
    });
    done("/admin/runners");
  });
}

export async function setRunnerActive(userId: string, active: boolean) {
  return attempt(async () => {
    await admin();
    await db
      .update(users)
      .set({ isActive: active, sessionVersion: active ? undefined : sql`${users.sessionVersion} + 1` })
      .where(and(eq(users.id, userId), eq(users.role, "runner")));
    if (!active) await db.update(runnerProfiles).set({ online: false }).where(eq(runnerProfiles.userId, userId));
    done("/admin/runners");
  });
}

// ── vendors ──────────────────────────────────────────────────

const vendorSchema = z.object({
  id: z.string().uuid().nullable(),
  name: z.string().trim().min(2, "Enter the shop name").max(80),
  category: z.string().refine((v): boolean => isCategoryId(v), "Pick a category"),
  description: z.string().trim().max(160),
  location: z.string().trim().max(120),
  contacts: z
    .array(z.object({ label: z.string().trim().max(40), email: z.string().trim().max(254) }))
    .max(6, "Add at most 6 people"),
  hours: z.string().trim().max(40),
  image: z.string().refine(isAllowedShopImage, "That photo isn't valid.").nullable(),
  isPartner: z.boolean(),
  isActive: z.boolean(),
  bank: z.object({ bankCode: z.string(), bankName: z.string(), accountNumber: z.string(), accountName: z.string().max(100).nullable().optional() }).nullable(),
});

export async function saveVendor(input: z.infer<typeof vendorSchema>) {
  return attempt(async () => {
    await admin();
    const parsed = vendorSchema.safeParse(input);
    if (!parsed.success) throw new UserError(parsed.error.issues[0]?.message ?? "Check the details.");
    const v = parsed.data;
    // Shop staff: each email can sign in to the shop's chat inbox.
    const contacts: VendorContact[] = [];
    for (const c of v.contacts) {
      if (!c.email) continue;
      const email = normalizeEmail(c.email);
      if (!email) throw new UserError(`"${c.email}" isn't a valid email. Staff sign in with a code sent to it.`);
      if (!contacts.some((x) => x.email === email)) contacts.push({ label: c.label || null, email, phone: null });
    }
    let bank = {};
    if (v.bank?.accountNumber) {
      const { accountName } = await resolveAccount(v.bank.accountNumber, v.bank.bankCode, v.bank.accountName).catch((err) => {
        throw err instanceof UserError ? err : new UserError("We couldn't verify the shop's bank account.");
      });
      bank = { bankCode: v.bank.bankCode, bankName: v.bank.bankName, accountNumber: v.bank.accountNumber, accountName, recipientCode: null };
    }
    const values = {
      name: v.name,
      category: v.category,
      description: v.description || null,
      location: v.location || null,
      contacts,
      image: v.image,
      hours: v.hours || null,
      isPartner: v.isPartner,
      isActive: v.isActive,
      ...bank,
    };
    const id = await db.transaction(async (tx) => {
      let vendorId = v.id;
      if (vendorId) await tx.update(vendors).set(values).where(eq(vendors.id, vendorId));
      else [{ id: vendorId }] = await tx.insert(vendors).values(values).returning({ id: vendors.id });
      await syncShopStaff(tx, vendorId!, v.name, contacts);
      return vendorId!;
    });
    done("/admin/vendors", "/home");
    return { id };
  });
}

/** Makes each staff email a shop login, and signs out anyone who was removed. */
async function syncShopStaff(tx: Tx, vendorId: string, shopName: string, staff: VendorContact[]) {
  for (const c of staff) {
    const [u] = await tx.select().from(users).where(eq(users.email, c.email));
    if (!u) {
      await tx.insert(users).values({ email: c.email, name: c.label || shopName, role: "vendor", vendorId });
      continue;
    }
    if (u.role === "admin" || u.role === "runner") {
      throw new UserError(`${c.email} belongs to a${u.role === "admin" ? "n admin" : " runner"} account.`);
    }
    if (u.vendorId && u.vendorId !== vendorId) throw new UserError(`${c.email} already works for another shop.`);
    await tx
      .update(users)
      .set({ vendorId, isActive: true, name: u.role === "vendor" ? c.label || shopName : u.name })
      .where(eq(users.id, u.id));
  }
  const keep = staff.map((c) => c.email);
  const current = await tx.select().from(users).where(eq(users.vendorId, vendorId));
  for (const u of current.filter((u) => !u.email || !keep.includes(u.email))) {
    await tx
      .update(users)
      .set({ vendorId: null, sessionVersion: sql`${users.sessionVersion} + 1`, ...(u.role === "vendor" ? { isActive: false } : {}) })
      .where(eq(users.id, u.id));
  }
}

const itemSchema = z.object({
  id: z.string().uuid().nullable(),
  vendorId: z.string().uuid(),
  name: z.string().trim().min(1, "Enter the item name").max(80),
  price: z.number().int().min(0).max(100_000_000),
  unit: z.string().trim().max(30),
  isPopular: z.boolean(),
  isActive: z.boolean(),
});

export async function saveItem(input: z.infer<typeof itemSchema>) {
  return attempt(async () => {
    await admin();
    const parsed = itemSchema.safeParse(input);
    if (!parsed.success) throw new UserError(parsed.error.issues[0]?.message ?? "Check the item.");
    const { id, ...v } = parsed.data;
    const values = { ...v, unit: v.unit || null };
    if (id) await db.update(vendorItems).set(values).where(eq(vendorItems.id, id));
    else await db.insert(vendorItems).values(values);
    done("/admin/vendors");
  });
}

export async function deleteItem(id: string) {
  return attempt(async () => {
    await admin();
    await db.delete(vendorItems).where(eq(vendorItems.id, id));
    done("/admin/vendors");
  });
}

// ── residents ────────────────────────────────────────────────

export async function setResidentActive(userId: string, active: boolean) {
  return attempt(async () => {
    await admin();
    const [busy] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.residentId, userId), sql`${orders.status} in ('searching','assigned','to_vendor','at_vendor','on_the_way','arrived')`));
    if (!active && busy) throw new UserError("They have an errand in progress.");
    await db
      .update(users)
      .set({ isActive: active, sessionVersion: active ? undefined : sql`${users.sessionVersion} + 1` })
      .where(and(eq(users.id, userId), eq(users.role, "resident")));
    done("/admin/residents");
  });
}

// ── settings ─────────────────────────────────────────────────

export async function saveSettings(next: Settings) {
  return attempt(async () => {
    await admin();
    const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!hhmm.test(next.openTime) || !hhmm.test(next.closeTime)) throw new UserError("Use HH:MM for opening hours.");
    if (next.runnerCommissionPct < 0 || next.runnerCommissionPct > 100) throw new UserError("Commission must be 0–100%.");
    for (const fee of Object.values(next.fees)) if (fee < 0) throw new UserError("Fees can't be negative.");
    const phone = next.supportPhone ? normalizePhone(next.supportPhone) : "";
    if (next.supportPhone && !phone) throw new UserError("Support phone isn't a valid Nigerian number.");
    if (next.runnerBuys && !transfersEnabled()) {
      throw new UserError("“Let a runner buy it” needs Paystack Transfers to pay shops. Turn it on once your business is registered.");
    }
    await persistSettings({ ...next, supportPhone: phone ?? "", announcement: next.announcement.trim().slice(0, 200) });
    done("/admin/settings", "/home", "/");
  });
}
