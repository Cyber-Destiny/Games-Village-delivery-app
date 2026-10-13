"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser, homeFor, needsOnboarding } from "@/lib/auth/dal";
import { requestOtp, verifyOtp } from "@/lib/auth/otp";
import { createSession, destroySession } from "@/lib/auth/session";
import { APP_NAME } from "@/lib/brand";
import { db } from "@/lib/db";
import { runnerProfiles, users } from "@/lib/db/schema";
import { attempt, UserError } from "@/lib/errors";
import { normalizePhone } from "@/lib/phone";

function adminPhones(): string[] {
  return (process.env.ADMIN_PHONES ?? "")
    .split(",")
    .map((p) => normalizePhone(p.trim()))
    .filter((p): p is string => !!p);
}

export async function requestCode(rawPhone: string) {
  return attempt(async () => {
    const phone = normalizePhone(rawPhone);
    if (!phone) throw new UserError("Enter a valid Nigerian phone number.");
    const res = await requestOtp(phone, APP_NAME);
    if (!res.ok) throw new UserError(res.error);
    return { phone, devCode: res.devCode ?? null, retryIn: res.retryIn };
  });
}

export async function verifyCode(phone: string, code: string) {
  return attempt(async () => {
    const normalized = normalizePhone(phone);
    if (!normalized || !/^\d{6}$/.test(code)) throw new UserError("Enter the 6-digit code.");
    const res = await verifyOtp(normalized, code);
    if (!res.ok) throw new UserError(res.error);

    // ADMIN_PHONES is the single source of truth for who is an admin.
    const isAdmin = adminPhones().includes(normalized);
    let [user] = await db.select().from(users).where(eq(users.phone, normalized));
    if (!user) {
      [user] = await db
        .insert(users)
        .values({ phone: normalized, role: isAdmin ? "admin" : "resident" })
        .returning();
    } else if (isAdmin && user.role !== "admin") {
      [user] = await db
        .update(users)
        .set({ role: "admin", sessionVersion: sql`${users.sessionVersion} + 1` })
        .where(eq(users.id, user.id))
        .returning();
    } else if (!isAdmin && user.role === "admin") {
      // Removed from ADMIN_PHONES → back to a regular resident; old admin sessions die.
      [user] = await db
        .update(users)
        .set({ role: "resident", sessionVersion: sql`${users.sessionVersion} + 1` })
        .where(eq(users.id, user.id))
        .returning();
    }
    if (!user.isActive) throw new UserError("This account has been disabled. Contact the estate admin.");
    if (user.role === "runner") {
      await db.insert(runnerProfiles).values({ userId: user.id }).onConflictDoNothing();
    }
    await createSession(user.id, user.sessionVersion);
    return { redirect: needsOnboarding(user) ? "/welcome" : homeFor(user) };
  });
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(60),
  block: z.string().trim().max(40).optional(),
  house: z.string().trim().max(40).optional(),
  street: z.string().trim().max(80).optional(),
  landmark: z.string().trim().max(120).optional(),
});

export async function completeProfile(input: z.infer<typeof profileSchema>) {
  return attempt(async () => {
    const user = await getCurrentUser();
    if (!user) throw new UserError("Please sign in again.");
    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) throw new UserError(parsed.error.issues[0]?.message ?? "Check your details.");
    const v = parsed.data;
    if (user.role === "resident" && (!v.block || !v.house)) throw new UserError("Add your block and house number.");
    await db
      .update(users)
      .set({
        name: v.name,
        block: v.block || user.block,
        house: v.house || user.house,
        street: v.street || null,
        landmark: v.landmark || null,
      })
      .where(eq(users.id, user.id));
    return { redirect: homeFor(user) };
  });
}

export async function signOut() {
  await destroySession();
  redirect("/login");
}
