import { json, withUser } from "@/lib/api";
import { UserError } from "@/lib/errors";
import { resolveAccount } from "@/lib/paystack";

// Account-name lookups cost money and reveal names, so keep them to genuine use.
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = { resident: 8, runner: 30, admin: 60, vendor: 8 } as const;
const hits = new Map<string, number[]>();

export const GET = withUser(async (req, user) => {
  const now = Date.now();
  const recent = (hits.get(user.id) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT[user.role]) throw new UserError("Too many account checks. Try again in a few minutes.");
  recent.push(now);
  hits.set(user.id, recent);

  const url = new URL(req.url);
  const account = url.searchParams.get("account") ?? "";
  const bank = url.searchParams.get("bank") ?? "";
  if (!/^\d{10}$/.test(account) || !bank) throw new UserError("Enter a 10-digit account number and pick a bank.");
  try {
    const { accountName } = await resolveAccount(account, bank);
    return json({ accountName });
  } catch {
    throw new UserError("We couldn't find that account. Check the number and bank.");
  }
});
