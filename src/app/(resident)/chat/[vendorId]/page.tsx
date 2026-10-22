import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/dal";
import { UserError } from "@/lib/errors";
import { residentChat } from "@/lib/shop-chat";
import { ShopChat } from "./shop-chat";

export const metadata: Metadata = { title: "Chat" };

export default async function ShopChatPage({ params }: { params: Promise<{ vendorId: string }> }) {
  const user = await requireRole("resident");
  const { vendorId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(vendorId)) notFound();
  const initial = await residentChat(user, vendorId).catch((err) => {
    if (err instanceof UserError) notFound();
    throw err;
  });
  return <ShopChat vendorId={vendorId} initial={initial} />;
}
