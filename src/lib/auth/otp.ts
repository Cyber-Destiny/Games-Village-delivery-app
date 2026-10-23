import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import { demoMode } from "../demo";
import { otpCodes } from "../db/schema";
import { sendSms, smsConfigured } from "../sms";

const TTL_MS = 10 * 60 * 1000;
const RESEND_AFTER_MS = 30 * 1000;
const MAX_PER_HOUR = 6;
const MAX_ATTEMPTS = 5;

function hash(phone: string, code: string) {
  return createHmac("sha256", process.env.SESSION_SECRET ?? "").update(`${phone}:${code}`).digest("hex");
}

/**
 * Local demo only: return the login code to the browser so the app can be tried
 * without SMS. Off unless DEMO_MODE=true, and always off once SMS is configured.
 */
export function showOtpOnScreen(): boolean {
  return demoMode() && !smsConfigured();
}

export type RequestOtpResult =
  | { ok: true; devCode?: string; retryIn: number }
  | { ok: false; error: string; retryIn?: number };

export async function requestOtp(phone: string, appName: string): Promise<RequestOtpResult> {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await db
    .select({ createdAt: otpCodes.createdAt })
    .from(otpCodes)
    .where(and(eq(otpCodes.phone, phone), gt(otpCodes.createdAt, hourAgo)))
    .orderBy(desc(otpCodes.createdAt));

  if (recent.length >= MAX_PER_HOUR) {
    return { ok: false, error: "Too many codes requested. Please try again in an hour." };
  }
  const last = recent[0];
  if (last) {
    const wait = RESEND_AFTER_MS - (Date.now() - last.createdAt.getTime());
    if (wait > 0) return { ok: false, error: "Please wait a moment before requesting another code.", retryIn: Math.ceil(wait / 1000) };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.insert(otpCodes).values({
    phone,
    codeHash: hash(phone, code),
    expiresAt: new Date(Date.now() + TTL_MS),
  });
  await sendSms(phone, `${code} is your ${appName} code. It expires in 10 minutes. Don't share it with anyone.`);

  return { ok: true, retryIn: RESEND_AFTER_MS / 1000, devCode: showOtpOnScreen() ? code : undefined };
}

export async function verifyOtp(phone: string, code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const [row] = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.phone, phone), isNull(otpCodes.consumedAt), gt(otpCodes.expiresAt, new Date())))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);

  if (!row) return { ok: false, error: "That code has expired. Request a new one." };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: "Too many wrong attempts. Request a new code." };

  const expected = Buffer.from(row.codeHash, "hex");
  const actual = Buffer.from(hash(phone, code), "hex");
  const match = expected.length === actual.length && timingSafeEqual(expected, actual);

  if (!match) {
    await db.update(otpCodes).set({ attempts: sql`${otpCodes.attempts} + 1` }).where(eq(otpCodes.id, row.id));
    const left = MAX_ATTEMPTS - row.attempts - 1;
    return { ok: false, error: left > 0 ? `Wrong code. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong attempts. Request a new code." };
  }

  await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, row.id));
  return { ok: true };
}
