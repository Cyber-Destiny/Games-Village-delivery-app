import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Thin Paystack client. When PAYSTACK_SECRET_KEY is not set the app runs in demo
// mode: checkout goes to a fake payment page and transfers settle after a few seconds.

const BASE = "https://api.paystack.co";

export function paystackLive(): boolean {
  return !!process.env.PAYSTACK_SECRET_KEY;
}

export function paystackTestKey(): boolean {
  return (process.env.PAYSTACK_SECRET_KEY ?? "").startsWith("sk_test_");
}

export class PaystackError extends Error {}

async function call<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: T } | null;
  if (!res.ok || !json?.status) {
    throw new PaystackError(json?.message || `Paystack request failed (${res.status})`);
  }
  return json.data as T;
}

export function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

// ── Charges ──────────────────────────────────────────────────

export async function initializeTransaction(input: {
  email: string;
  amount: number;
  reference: string;
  metadata: Record<string, unknown>;
}): Promise<{ url: string }> {
  if (!paystackLive()) {
    return { url: `/pay/mock?reference=${encodeURIComponent(input.reference)}` };
  }
  const data = await call<{ authorization_url: string }>("/transaction/initialize", {
    method: "POST",
    body: {
      email: input.email,
      amount: input.amount,
      currency: "NGN",
      reference: input.reference,
      callback_url: `${appUrl()}/pay/callback`,
      metadata: input.metadata,
      channels: ["card", "bank_transfer", "ussd", "bank"],
    },
  });
  return { url: data.authorization_url };
}

export type VerifiedTransaction = {
  status: "success" | "failed" | "abandoned" | "pending";
  amount: number;
  currency: string;
  channel: string | null;
  raw: unknown;
};

export async function verifyTransaction(reference: string): Promise<VerifiedTransaction> {
  const data = await call<{ status: string; amount: number; currency: string; channel?: string }>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
  );
  const status = (["success", "failed", "abandoned"].includes(data.status) ? data.status : "pending") as VerifiedTransaction["status"];
  return { status, amount: data.amount, currency: data.currency, channel: data.channel ?? null, raw: data };
}

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !process.env.PAYSTACK_SECRET_KEY) return false;
  const expected = createHmac("sha512", process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ── Banks & transfers ────────────────────────────────────────

export type Bank = { name: string; code: string };

const DEMO_BANKS: Bank[] = [
  { name: "Access Bank", code: "044" },
  { name: "Ecobank Nigeria", code: "050" },
  { name: "Fidelity Bank", code: "070" },
  { name: "First Bank of Nigeria", code: "011" },
  { name: "First City Monument Bank", code: "214" },
  { name: "Guaranty Trust Bank", code: "058" },
  { name: "Jaiz Bank", code: "301" },
  { name: "Keystone Bank", code: "082" },
  { name: "Kuda Bank", code: "50211" },
  { name: "Moniepoint MFB", code: "50515" },
  { name: "OPay Digital Services Limited (OPay)", code: "999992" },
  { name: "PalmPay", code: "999991" },
  { name: "Polaris Bank", code: "076" },
  { name: "Providus Bank", code: "101" },
  { name: "Stanbic IBTC Bank", code: "221" },
  { name: "Sterling Bank", code: "232" },
  { name: "Union Bank of Nigeria", code: "032" },
  { name: "United Bank For Africa", code: "033" },
  { name: "Unity Bank", code: "215" },
  { name: "Wema Bank", code: "035" },
  { name: "Zenith Bank", code: "057" },
];

let bankCache: { at: number; banks: Bank[] } | null = null;

export async function listBanks(): Promise<Bank[]> {
  if (!paystackLive()) return DEMO_BANKS;
  if (bankCache && Date.now() - bankCache.at < 24 * 60 * 60 * 1000) return bankCache.banks;
  const data = await call<Array<{ name: string; code: string; active: boolean; type: string }>>(
    "/bank?country=nigeria&perPage=200&currency=NGN",
  );
  const banks = data
    .filter((b) => b.active)
    .map((b) => ({ name: b.name, code: b.code }))
    .sort((a, b) => a.name.localeCompare(b.name));
  bankCache = { at: Date.now(), banks };
  return banks;
}

export async function resolveAccount(accountNumber: string, bankCode: string): Promise<{ accountName: string }> {
  if (!/^\d{10}$/.test(accountNumber)) throw new PaystackError("Account number must be 10 digits.");
  if (!paystackLive()) {
    return { accountName: `DEMO ACCOUNT ${accountNumber.slice(-4)}` };
  }
  const data = await call<{ account_name: string }>(
    `/bank/resolve?account_number=${accountNumber}&bank_code=${encodeURIComponent(bankCode)}`,
  );
  return { accountName: data.account_name };
}

export async function createRecipient(input: { name: string; accountNumber: string; bankCode: string }): Promise<string> {
  if (!paystackLive()) return `RCP_demo_${input.accountNumber}`;
  const data = await call<{ recipient_code: string }>("/transferrecipient", {
    method: "POST",
    body: {
      type: "nuban",
      name: input.name,
      account_number: input.accountNumber,
      bank_code: input.bankCode,
      currency: "NGN",
    },
  });
  return data.recipient_code;
}

export type TransferResult = { status: "success" | "pending" | "failed"; transferCode: string | null; message?: string };

export async function initiateTransfer(input: {
  amount: number;
  recipientCode: string;
  reference: string;
  reason: string;
}): Promise<TransferResult> {
  if (!paystackLive()) return { status: "pending", transferCode: `TRF_demo_${input.reference.slice(-8)}` };
  try {
    const data = await call<{ status: string; transfer_code: string }>("/transfer", {
      method: "POST",
      body: {
        source: "balance",
        amount: input.amount,
        recipient: input.recipientCode,
        reference: input.reference,
        reason: input.reason.slice(0, 100),
        currency: "NGN",
      },
    });
    if (data.status === "otp") {
      return {
        status: "failed",
        transferCode: data.transfer_code,
        message: "Paystack is asking for an OTP. Turn off OTP for transfers in your Paystack dashboard.",
      };
    }
    return { status: data.status === "success" ? "success" : data.status === "failed" ? "failed" : "pending", transferCode: data.transfer_code };
  } catch (err) {
    return { status: "failed", transferCode: null, message: err instanceof Error ? err.message : "Transfer failed" };
  }
}

export async function verifyTransfer(reference: string): Promise<"success" | "failed" | "reversed" | "pending"> {
  const data = await call<{ status: string }>(`/transfer/verify/${encodeURIComponent(reference)}`);
  if (data.status === "success" || data.status === "failed" || data.status === "reversed") return data.status;
  return "pending";
}
