import type { CategoryId } from "./categories";

export type Settings = {
  estateName: string;
  /** Service fee per category, in kobo */
  fees: Record<CategoryId, number>;
  /** Share of the service fee paid to the runner (0–100) */
  runnerCommissionPct: number;
  /** Every Nth delivered errand has its service fee waived. 0 disables. */
  loyaltyEvery: number;
  weeklyBonusTarget: number;
  /** kobo */
  weeklyBonusAmount: number;
  /** kobo */
  maxBudget: number;
  serviceOpen: boolean;
  openTime: string;
  closeTime: string;
  /** Pay partner vendors automatically when the runner confirms the purchase */
  autoPayPartnerVendors: boolean;
  supportPhone: string;
  announcement: string;
};

export const DEFAULT_SETTINGS: Settings = {
  estateName: "Games Village",
  fees: { food: 50000, groceries: 50000, gas: 70000, pickup: 40000, laundry: 50000, other: 50000 },
  runnerCommissionPct: 70,
  loyaltyEvery: 10,
  weeklyBonusTarget: 40,
  weeklyBonusAmount: 500000,
  maxBudget: 10000000,
  serviceOpen: true,
  openTime: "07:00",
  closeTime: "21:00",
  autoPayPartnerVendors: true,
  supportPhone: "",
  announcement: "",
};
