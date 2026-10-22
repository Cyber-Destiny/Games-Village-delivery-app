import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireShopStaff } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { vendors } from "@/lib/db/schema";
import { UserError } from "@/lib/errors";
import { vendorChat } from "@/lib/shop-chat";
import { VendorChat } from "./vendor-chat";

export const metadata: Metadata = { title: "Chat" };

export default async function VendorChatPage({ params }: { params: Promise<{ threadId: string }> }) {
  const user = await requireShopStaff();
  const { threadId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(threadId)) notFound();
  const [initial, [shop]] = await Promise.all([
    vendorChat(user, threadId).catch((err) => {
      if (err instanceof UserError) notFound();
      throw err;
    }),
    db.select().from(vendors).where(eq(vendors.id, user.vendorId)),
  ]);
  const bank = shop?.accountNumber && shop.bankName ? `Please pay to ${shop.bankName}, ${shop.accountNumber} (${shop.accountName ?? shop.name}).` : null;
  return <VendorChat threadId={threadId} initial={initial} bankLine={bank} />;
}
