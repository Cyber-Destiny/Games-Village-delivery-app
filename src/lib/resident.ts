import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { orders, vendorItems, vendors, type User } from "./db/schema";
import { ACTIVE_STATUSES } from "./orders/status";
import { listResidentOrders } from "./orders/queries";
import { paidOrderCount } from "./orders/service";
import { getSettings, isOpenNow } from "./settings";

export async function getShops() {
  const [shopRows, itemRows] = await Promise.all([
    db.select().from(vendors).where(eq(vendors.isActive, true)).orderBy(asc(vendors.sort), asc(vendors.name)),
    db
      .select()
      .from(vendorItems)
      .where(eq(vendorItems.isActive, true))
      .orderBy(desc(vendorItems.isPopular), asc(vendorItems.sort), asc(vendorItems.name)),
  ]);
  return shopRows.map((v) => ({
    id: v.id,
    name: v.name,
    category: v.category,
    description: v.description,
    location: v.location,
    hours: v.hours,
    isPartner: v.isPartner && !!v.accountNumber,
    items: itemRows
      .filter((i) => i.vendorId === v.id)
      .map((i) => ({ id: i.id, name: i.name, price: i.price, unit: i.unit, popular: i.isPopular })),
  }));
}

export type Shop = Awaited<ReturnType<typeof getShops>>[number];

export async function getResidentHome(user: User) {
  const s = await getSettings();
  const [shops, recent, paidCount, active] = await Promise.all([
    getShops(),
    listResidentOrders(user.id, 12),
    paidOrderCount(user.id),
    db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.residentId, user.id), inArray(orders.status, [...ACTIVE_STATUSES, "awaiting_payment"]))),
  ]);
  const activeIds = new Set(active.map((a) => a.id));
  return {
    open: isOpenNow(s),
    openTime: s.openTime,
    closeTime: s.closeTime,
    announcement: s.announcement,
    loyaltyEvery: s.loyaltyEvery,
    loyaltyProgress: s.loyaltyEvery > 0 ? paidCount % s.loyaltyEvery : 0,
    shops,
    activeOrders: recent.filter((o) => activeIds.has(o.id)),
    reorder: recent.filter((o) => o.status === "delivered").slice(0, 3),
  };
}

export async function getWallet(userId: string) {
  const { walletEntries, payouts, users } = await import("./db/schema");
  const [[u], entries, withdrawals] = await Promise.all([
    db.select({ balance: users.walletBalance }).from(users).where(eq(users.id, userId)),
    db.select({ e: walletEntries, code: orders.code }).from(walletEntries).leftJoin(orders, eq(orders.id, walletEntries.orderId)).where(eq(walletEntries.userId, userId)).orderBy(desc(walletEntries.createdAt)).limit(60),
    db
      .select()
      .from(payouts)
      .where(and(eq(payouts.userId, userId), eq(payouts.type, "withdrawal")))
      .orderBy(desc(payouts.createdAt))
      .limit(10),
  ]);
  return {
    balance: u?.balance ?? 0,
    entries: entries.map(({ e, code }) => ({
      id: e.id,
      type: e.type,
      amount: e.amount,
      note: e.note,
      code,
      orderId: e.orderId,
      createdAt: e.createdAt.toISOString(),
    })),
    withdrawals: withdrawals.map((w) => ({
      id: w.id,
      amount: w.amount,
      status: w.status,
      accountName: w.accountName,
      bankName: w.bankName,
      createdAt: w.createdAt.toISOString(),
    })),
  };
}

export type WalletData = Awaited<ReturnType<typeof getWallet>>;
