"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assertRole } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { runnerProfiles } from "@/lib/db/schema";
import { attempt, UserError } from "@/lib/errors";
import {
  acceptJob,
  arriveAtVendor,
  completeDelivery,
  declineJob,
  markArrived,
  setRunnerOnline,
  startDelivery,
  submitPurchase,
} from "@/lib/orders/service";
import { resolveAccount } from "@/lib/paystack";

const runner = () => assertRole("runner");

export async function setOnline(online: boolean) {
  return attempt(async () => setRunnerOnline(await runner(), online));
}

export async function accept(orderId: string) {
  return attempt(async () => acceptJob(await runner(), orderId));
}

export async function decline(orderId: string, reason: string) {
  return attempt(async () => declineJob(await runner(), orderId, reason));
}

export async function atShop(orderId: string) {
  return attempt(async () => {
    await arriveAtVendor(await runner(), orderId);
  });
}

export async function confirmPurchase(
  orderId: string,
  input: { actualCost: number; receiptId: string | null; account: { bankCode: string; bankName: string; accountNumber: string } | null },
) {
  return attempt(async () => submitPurchase(await runner(), orderId, input));
}

export async function headOut(orderId: string) {
  return attempt(async () => startDelivery(await runner(), orderId));
}

export async function arrived(orderId: string) {
  return attempt(async () => markArrived(await runner(), orderId));
}

export async function complete(orderId: string, code: string) {
  return attempt(async () => completeDelivery(await runner(), orderId, code));
}

export async function saveBank(input: { bankCode: string; bankName: string; accountNumber: string }) {
  return attempt(async () => {
    const r = await runner();
    if (!/^\d{10}$/.test(input.accountNumber)) throw new UserError("Account number must be 10 digits.");
    const { accountName } = await resolveAccount(input.accountNumber, input.bankCode).catch((err) => {
      throw err instanceof UserError ? err : new UserError("We couldn't verify that account.");
    });
    await db
      .update(runnerProfiles)
      .set({ bankCode: input.bankCode, bankName: input.bankName, accountNumber: input.accountNumber, accountName, recipientCode: null })
      .where(eq(runnerProfiles.userId, r.id));
    revalidatePath("/runner/profile");
    return { accountName };
  });
}
