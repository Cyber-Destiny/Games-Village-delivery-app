import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { ESTATE_NAME } from "../brand";
import { db } from "../db";
import { otpCodes } from "../db/schema";
import { demoMode } from "../demo";
import { codeEmail, emailConfigured, sendEmail } from "../email";

// One-time sign-in codes, sent by email.

const TTL_MS = 10 * 60 * 1000;
const RESEND_AFTER_MS = 30 * 1000;
const MAX_PER_HOUR = 6;
const MAX_PER_IP_HOUR = 15;
const MAX_ATTEMPTS = 5;

function hash(target: string, code: string) {
  return createHmac("sha256", process.env.SESSION_SECRET ?? "").update(`${target}:${code}`).digest("hex");
}

/**
 * Local demo only: return the login code to the browser so the app can be tried
 * without email. Off unless DEMO_MODE=true, and always off once email is configured.
 */
export function showOtpOnScreen(): boolean {
  return demoMode() && !emailConfigured();
}

export type RequestOtpResult =
  | { ok: true; devCode?: string; retryIn: number }
  | { ok: false; error: string; retryIn?: number };

export async function requestOtp(email: string, ip: string | null): Promise<RequestOtpResult> {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await db
    .select({ createdAt: otpCodes.createdAt })
    .from(otpCodes)
    .where(and(eq(otpCodes.target, email), gt(otpCodes.createdAt, hourAgo)))
    .orderBy(desc(otpCodes.createdAt));

  if (recent.length >= MAX_PER_HOUR) {
    return { ok: false, error: "Too many codes requested. Please try again in an hour." };
  }
  const last = recent[0];
  if (last) {
    const wait = RESEND_AFTER_MS - (Date.now() - last.createdAt.getTime());
    if (wait > 0) return { ok: false, error: "Please wait a moment before requesting another code.", retryIn: Math.ceil(wait / 1000) };
  }
  if (ip) {
    const [fromIp] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(otpCodes)
      .where(and(eq(otpCodes.ip, ip), gt(otpCodes.createdAt, hourAgo)));
    if ((fromIp?.n ?? 0) >= MAX_PER_IP_HOUR) return { ok: false, error: "Too many codes requested. Please try again later." };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.insert(otpCodes).values({
    target: email,
    ip,
    codeHash: hash(email, code),
    expiresAt: new Date(Date.now() + TTL_MS),
  });
  const sent = await sendEmail({ to: email, ...codeEmail(code, ESTATE_NAME) });
  if (!sent && emailConfigured()) {
    return { ok: false, error: "We couldn't send the email just now. Check the address and try again in a minute." };
  }

  return { ok: true, retryIn: RESEND_AFTER_MS / 1000, devCode: showOtpOnScreen() ? code : undefined };
}

export async function verifyOtp(email: string, code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const [row] = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.target, email), isNull(otpCodes.consumedAt), gt(otpCodes.expiresAt, new Date())))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);

  if (!row) return { ok: false, error: "That code has expired. Request a new one." };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: "Too many wrong attempts. Request a new code." };

  const expected = Buffer.from(row.codeHash, "hex");
  const actual = Buffer.from(hash(email, code), "hex");
  const match = expected.length === actual.length && timingSafeEqual(expected, actual);

  if (!match) {
    await db.update(otpCodes).set({ attempts: sql`${otpCodes.attempts} + 1` }).where(eq(otpCodes.id, row.id));
    const left = MAX_ATTEMPTS - row.attempts - 1;
    return { ok: false, error: left > 0 ? `Wrong code. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong attempts. Request a new code." };
  }

  await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, row.id));
  return { ok: true };
}
