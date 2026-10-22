"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { ChatView } from "@/components/chat/chat-view";
import { Avatar } from "@/components/ui/avatar";
import type { vendorChat } from "@/lib/shop-chat";

type Data = Awaited<ReturnType<typeof vendorChat>>;

export function VendorChat({ threadId, initial, bankLine }: { threadId: string; initial: Data; bankLine: string | null }) {
  const quick = [
    "Hi! Yes, we have it.",
    "Sorry, we're out of that today.",
    ...(bankLine ? [bankLine] : []),
    "Payment received, thank you.",
    "Your order is packed. Send a rider when you're ready.",
  ];
  return (
    <ChatView
      side="vendor"
      endpoint={`/api/shop-inbox/${threadId}`}
      initial={initial}
      quickReplies={quick}
      placeholder={`Message ${initial.customer}`}
      header={() => (
        <div className="flex h-16 items-center gap-3 px-3">
          <Link href="/shop" aria-label="Back" className="grid size-10 place-items-center rounded-full hover:bg-sunken">
            <ChevronLeft className="size-6" strokeWidth={2.2} />
          </Link>
          <Avatar name={initial.customer} size={40} />
          <div className="min-w-0">
            <p className="truncate text-[15.5px] font-semibold text-ink">{initial.customer}</p>
            <p className="truncate text-[12px] text-muted">Customer in the estate</p>
          </div>
        </div>
      )}
    />
  );
}
