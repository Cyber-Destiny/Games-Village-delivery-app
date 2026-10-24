"use server";

import { eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser, homeFor, needsOnboarding } from "@/lib/auth/dal";
import { requestOtp, verifyOtp } from "@/lib/auth/otp";
import { createSession, destroySession } from "@/lib/auth/session";
import { APP_NAME } from "@/lib/brand";
import { db } from "@/lib/db";
import { runnerProfiles, users } from "@/lib/db/schema";
import { normalizeEmail } from "@/lib/email-address";
import { attempt, UserError } from "@/lib/errors";
import { formatPhoneLocal, normalizePhone } from "@/lib/phone";
import { getSettings } from "@/lib/settings";
import { assertPhoneFree } from "@/lib/users";

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => normalizeEmail(e))
    .filter((e): e is string => !!e);
}

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

export async function requestCode(rawEmail: string) {
  return attempt(async () => {
    const email = normalizeEmail(rawEmail);
    if (!email) throw new UserError("Enter a valid email address.");
    const res = await requestOtp(email, await clientIp());
    if (!res.ok) throw new UserError(res.error);
    return { email, devCode: res.devCode ?? null, retryIn: res.retryIn };
  });
}

export async function verifyCode(rawEmail: string, code: string) {
  return attempt(async () => {
    const email = normalizeEmail(rawEmail);
    if (!email || !/^\d{6}$/.test(code)) throw new UserError("Enter the 6-digit code.");
    const res = await verifyOtp(email, code);
    if (!res.ok) throw new UserError(res.error);

    // ADMIN_EMAILS is the single source of truth for who is an admin.
    const isAdmin = adminEmails().includes(email);
    let [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) {
      [user] = await db
        .insert(users)
        .values({ email, role: isAdmin ? "admin" : "resident" })
        .returning();
    } else if (isAdmin && user.role !== "admin") {
      [user] = await db
        .update(users)
        .set({ role: "admin", sessionVersion: sql`${users.sessionVersion} + 1` })
        .where(eq(users.id, user.id))
        .returning();
    } else if (!isAdmin && user.role === "admin") {
      // Removed from ADMIN_EMAILS → back to a regular resident; old admin sessions die.
      [user] = await db
        .update(users)
        .set({ role: "resident", sessionVersion: sql`${users.sessionVersion} + 1` })
        .where(eq(users.id, user.id))
        .returning();
    }
    if (!user.isActive) {
      const { supportPhone } = await getSettings();
      throw new UserError(`This account has been disabled. ${supportPhone ? `Call or WhatsApp ${formatPhoneLocal(supportPhone)} for help.` : "Contact support for help."}`);
    }
    if (user.role === "runner") {
      await db.insert(runnerProfiles).values({ userId: user.id }).onConflictDoNothing();
    }
    await createSession(user.id, user.sessionVersion);
    return { redirect: needsOnboarding(user) ? "/welcome" : homeFor(user) };
  });
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(60),
  phone: z.string().trim().max(20).optional(),
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
    const phone = v.phone ? normalizePhone(v.phone) : user.phone;
    if (v.phone && !phone) throw new UserError("Enter a valid Nigerian phone number.");
    if (user.role === "resident" && !phone) throw new UserError("Add your phone number.");
    if (phone && phone !== user.phone) await assertPhoneFree(phone, user.id);
    await db
      .update(users)
      .set({
        name: v.name,
        phone,
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
