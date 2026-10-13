import { json, withUser } from "@/lib/api";
import { UserError } from "@/lib/errors";
import { resolveAccount } from "@/lib/paystack";

export const GET = withUser(async (req) => {
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
