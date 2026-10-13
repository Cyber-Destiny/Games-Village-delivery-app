"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertRole } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { attempt, UserError } from "@/lib/errors";
import {
  cancelByResident,
  createOrder,
  rateOrder,
  requestWithdrawal,
  respondToTopup,
  resumePayment,
  type CreateOrderInput,
} from "@/lib/orders/service";

const RESIDENT = ["resident", "admin"] as const;

export async function placeErrand(input: CreateOrderInput) {
  return attempt(async () => {
    const user = await assertRole(...RESIDENT);
    const res = await createOrder(user, input);
    revalidatePath("/home");
    return res;
  });
}

export async function payNow(orderId: string) {
  return attempt(async () => {
    const user = await assertRole(...RESIDENT);
    return { payUrl: await resumePayment(user, orderId) };
  });
}

export async function cancelErrand(orderId: string, reason: string) {
  return attempt(async () => {
    const user = await assertRole(...RESIDENT);
    await cancelByResident(user, orderId, reason);
  });
}

export async function answerTopup(topupId: string, approve: boolean) {
  return attempt(async () => {
    const user = await assertRole(...RESIDENT);
    return respondToTopup(user, topupId, approve);
  });
}

export async function rateErrand(orderId: string, rating: number, tags: string[], comment: string) {
  return attempt(async () => {
    const user = await assertRole(...RESIDENT);
    await rateOrder(user, orderId, { rating, tags, comment: comment || null });
  });
}

export async function withdraw(input: { amount: number; bankCode: string; bankName: string; accountNumber: string }) {
  return attempt(async () => {
    const user = await assertRole(...RESIDENT);
    const res = await requestWithdrawal(user, input);
    revalidatePath("/wallet");
    return res;
  });
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(60),
  email: z.union([z.literal(""), z.email("Enter a valid email")]),
  block: z.string().trim().min(1, "Add your block").max(40),
  house: z.string().trim().min(1, "Add your house number").max(40),
  street: z.string().trim().max(80),
  landmark: z.string().trim().max(120),
});

export async function saveProfile(input: z.infer<typeof profileSchema>) {
  return attempt(async () => {
    const user = await assertRole(...RESIDENT);
    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) throw new UserError(parsed.error.issues[0]?.message ?? "Check your details.");
    const v = parsed.data;
    await db
      .update(users)
      .set({ name: v.name, email: v.email || null, block: v.block, house: v.house, street: v.street || null, landmark: v.landmark || null })
      .where(eq(users.id, user.id));
    revalidatePath("/account");
  });
}
