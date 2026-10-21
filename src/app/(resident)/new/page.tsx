import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/dal";
import { isCategoryId, type CategoryId } from "@/lib/categories";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { paidOrderCount } from "@/lib/orders/service";
import { getShops } from "@/lib/resident";
import { getSettings, isOpenNow } from "@/lib/settings";
import { NewErrand, type Prefill } from "./new-errand";

export const metadata: Metadata = { title: "New errand" };

export default async function NewErrandPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; vendor?: string; add?: string; from?: string; q?: string }>;
}) {
  const user = await requireRole("resident", "admin");
  const sp = await searchParams;
  const [s, shops, paidCount] = await Promise.all([getSettings(), getShops(), paidOrderCount(user.id)]);

  let prefill: Prefill = { category: isCategoryId(sp.category ?? "") ? (sp.category as CategoryId) : null };

  if (sp.vendor) {
    const shop = shops.find((v) => v.id === sp.vendor);
    if (shop) {
      prefill = { ...prefill, category: (prefill.category ?? shop.category) as CategoryId, vendorId: shop.id };
      if (sp.add) {
        const items = sp.add
          .split(",")
          .map((pair) => pair.split(":"))
          .map(([id, qty]) => ({ it: shop.items.find((i) => i.id === id), qty: Math.max(1, Math.min(99, Number(qty) || 1)) }))
          .filter((x) => x.it)
          .map(({ it, qty }) => ({ itemId: it!.id, name: it!.name, price: it!.price, qty }));
        prefill.items = items;
      }
    }
  }

  if (sp.from) {
    const [o] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, sp.from), eq(orders.residentId, user.id)));
    if (o?.collectAs && o.vendorId) redirect(`/collect?vendor=${o.vendorId}`);
    if (o && isCategoryId(o.category)) {
      prefill = {
        category: o.category,
        vendorId: o.vendorId && shops.some((v) => v.id === o.vendorId) ? o.vendorId : null,
        otherVendorName: o.vendorId ? null : o.vendorName,
        items: o.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price ?? null })),
        notes: o.notes,
        pickupFrom: o.pickupFrom,
        deliverTo: o.deliverTo,
        budget: o.budget,
      };
    }
  }

  if (sp.q) prefill = { ...prefill, notes: sp.q.slice(0, 300), category: prefill.category ?? "other" };

  return (
    <NewErrand
      prefill={prefill}
      shops={shops}
      fees={s.fees}
      loyaltyEvery={s.loyaltyEvery}
      paidCount={paidCount}
      maxBudget={s.maxBudget}
      walletBalance={user.walletBalance}
      open={isOpenNow(s)}
      hours={`${s.openTime}–${s.closeTime}`}
      address={{ block: user.block ?? "", house: user.house ?? "", street: user.street ?? "", landmark: user.landmark ?? "" }}
    />
  );
}
