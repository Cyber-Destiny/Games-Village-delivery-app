import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import type { DbOrTx } from "./db";
import { users, walletEntries, walletEntryTypeEnum } from "./db/schema";
import { UserError } from "./errors";

type EntryType = (typeof walletEntryTypeEnum.enumValues)[number];
type Ref = { orderId?: string | null; payoutId?: string | null; note?: string | null };

export async function walletCredit(tx: DbOrTx, userId: string, amount: number, type: EntryType, ref: Ref = {}) {
  if (amount <= 0) return;
  const [row] = await tx
    .update(users)
    .set({ walletBalance: sql`${users.walletBalance} + ${amount}` })
    .where(eq(users.id, userId))
    .returning({ balance: users.walletBalance });
  await tx.insert(walletEntries).values({
    userId,
    amount,
    type,
    balanceAfter: row.balance,
    orderId: ref.orderId ?? null,
    payoutId: ref.payoutId ?? null,
    note: ref.note ?? null,
  });
}

export async function walletDebit(tx: DbOrTx, userId: string, amount: number, type: EntryType, ref: Ref = {}) {
  if (amount <= 0) return;
  const [row] = await tx
    .update(users)
    .set({ walletBalance: sql`${users.walletBalance} - ${amount}` })
    .where(and(eq(users.id, userId), gte(users.walletBalance, amount)))
    .returning({ balance: users.walletBalance });
  if (!row) throw new UserError("Your wallet balance is too low for that.");
  await tx.insert(walletEntries).values({
    userId,
    amount: -amount,
    type,
    balanceAfter: row.balance,
    orderId: ref.orderId ?? null,
    payoutId: ref.payoutId ?? null,
    note: ref.note ?? null,
  });
}
