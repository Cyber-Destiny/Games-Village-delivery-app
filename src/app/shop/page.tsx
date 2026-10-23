import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { requireShopStaff } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { vendors } from "@/lib/db/schema";
import { getSettings } from "@/lib/settings";
import { vendorInbox, vendorPickups } from "@/lib/shop-chat";
import { supportUnread } from "@/lib/support";
import { ShopInbox } from "./shop-inbox";

export const metadata: Metadata = { title: "Chats" };

export default async function ShopHome() {
  const user = await requireShopStaff();
  const [[shop], threads, pickups, s, unread] = await Promise.all([
    db.select().from(vendors).where(eq(vendors.id, user.vendorId)),
    vendorInbox(user),
    vendorPickups(user),
    getSettings(),
    supportUnread(user.id),
  ]);
  return (
    <ShopInbox
      shop={{ name: shop.name, image: shop.image, category: shop.category }}
      staffName={user.name ?? ""}
      alsoResident={user.role === "resident"}
      initial={{ threads, pickups }}
      supportPhone={s.supportPhone}
      supportUnread={unread}
    />
  );
}
