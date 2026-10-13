// Shared by the checkout screen (preview) and the server (authoritative).
import type { CategoryId } from "../categories";
import type { Settings } from "../settings-shared";

export type Quote = {
  serviceFee: number;
  discount: number;
  loyaltyFree: boolean;
  total: number;
  walletApplied: number;
  toPay: number;
  /** Errands left until the next free one (0 = this one is free, -1 = loyalty off). */
  loyaltyRemaining: number;
};

export function computeQuote(
  s: Pick<Settings, "fees" | "loyaltyEvery">,
  input: { category: CategoryId; budget: number; walletBalance: number; useWallet: boolean; paidCount: number },
): Quote {
  const serviceFee = s.fees[input.category] ?? s.fees.other;
  const every = s.loyaltyEvery;
  const position = every > 0 ? (input.paidCount % every) + 1 : 0; // 1..every
  const loyaltyFree = every > 0 && position === every;
  const loyaltyRemaining = every > 0 ? every - position : -1;
  const discount = loyaltyFree ? serviceFee : 0;
  const total = input.budget + serviceFee - discount;
  const walletApplied = input.useWallet ? Math.min(Math.max(input.walletBalance, 0), total) : 0;
  return { serviceFee, discount, loyaltyFree, total, walletApplied, toPay: total - walletApplied, loyaltyRemaining };
}

/** Suggested budget: priced items + 10% headroom, rounded up to the next ₦100. */
export function suggestBudget(items: Array<{ qty: number; price?: number | null }>): number {
  const sum = items.reduce((a, i) => a + (i.price ?? 0) * i.qty, 0);
  if (!sum) return 0;
  return Math.ceil((sum * 1.1) / 10000) * 10000;
}
