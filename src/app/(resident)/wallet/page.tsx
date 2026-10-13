import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/dal";
import { getWallet } from "@/lib/resident";
import { WalletView } from "./wallet-view";

export const metadata: Metadata = { title: "Wallet" };

export default async function WalletPage() {
  const user = await requireRole("resident", "admin");
  return <WalletView data={await getWallet(user.id)} />;
}
