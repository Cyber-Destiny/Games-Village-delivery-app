import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/dal";
import { getShops } from "@/lib/resident";
import { ShopView } from "./shop-view";

export const metadata: Metadata = { title: "Shop" };

export default async function ShopPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("resident", "admin");
  const { id } = await params;
  const shop = (await getShops()).find((s) => s.id === id);
  if (!shop) notFound();
  return <ShopView shop={shop} />;
}
