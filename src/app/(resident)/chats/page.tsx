import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { ChatList } from "@/components/chat/chat-list";
import { requireRole } from "@/lib/auth/dal";
import { residentThreads } from "@/lib/shop-chat";

export const metadata: Metadata = { title: "Chats" };

export default async function ChatsPage() {
  const user = await requireRole("resident");
  const threads = await residentThreads(user.id);
  return (
    <main className="pb-36">
      <div className="px-5">
        <PageHeader title="Chats" back="/home" />
      </div>
      {threads.length ? (
        <ChatList threads={threads} className="mx-5 mt-2" />
      ) : (
        <div className="mx-5 mt-10 text-center">
          <p className="font-display text-[19px] font-semibold text-ink">No chats yet</p>
          <p className="mt-1 text-[14px] text-muted">Open a shop and tap Chat to order from them.</p>
          <Link href="/home" className="mt-5 inline-flex h-11 items-center rounded-full bg-primary px-5 text-[14.5px] font-semibold text-primary-ink">
            Browse shops
          </Link>
        </div>
      )}
    </main>
  );
}
