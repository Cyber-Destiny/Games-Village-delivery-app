import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/dal";
import { paidOrderCount } from "@/lib/orders/service";
import { getShops } from "@/lib/resident";
import { formatHours } from "@/lib/time";
import { getSettings, isOpenNow } from "@/lib/settings";
import { CollectForm } from "./collect-form";

export const metadata: Metadata = { title: "Send a rider" };

export default async function CollectPage({ searchParams }: { searchParams: Promise<{ vendor?: string }> }) {
  const user = await requireRole("resident", "admin");
  const { vendor } = await searchParams;
  const [s, shops, paidCount] = await Promise.all([getSettings(), getShops(), paidOrderCount(user.id)]);
  const shop = shops.find((v) => v.id === vendor);
  if (!shop) redirect("/home");

  return (
    <CollectForm
      shop={shop}
      fees={s.fees}
      loyaltyEvery={s.loyaltyEvery}
      paidCount={paidCount}
      walletBalance={user.walletBalance}
      open={isOpenNow(s)}
      hours={formatHours(s.openTime, s.closeTime)}
      name={user.name ?? ""}
      address={{ block: user.block ?? "", house: user.house ?? "", street: user.street ?? "", landmark: user.landmark ?? "" }}
    />
  );
}
