import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { requireShopStaff } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { vendors } from "@/lib/db/schema";
import { vendorInbox, vendorPickups } from "@/lib/shop-chat";
import { ShopInbox } from "./shop-inbox";

export const metadata: Metadata = { title: "Chats" };

export default async function ShopHome() {
  const user = await requireShopStaff();
  const [[shop], threads, pickups] = await Promise.all([
    db.select().from(vendors).where(eq(vendors.id, user.vendorId)),
    vendorInbox(user),
    vendorPickups(user),
  ]);
  return (
    <ShopInbox
      shop={{ name: shop.name, image: shop.image, category: shop.category }}
      staffName={user.name ?? ""}
      alsoResident={user.role === "resident"}
      initial={{ threads, pickups }}
    />
  );
}
