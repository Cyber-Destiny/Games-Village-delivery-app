"use client";

import { ChevronLeft, Phone } from "lucide-react";
import Link from "next/link";
import { ChatView } from "@/components/chat/chat-view";
import { Avatar } from "@/components/ui/avatar";
import { telLink } from "@/lib/contact";
import { formatPhoneLocal } from "@/lib/phone";
import type { adminSupportChat } from "@/lib/support";

type Data = Awaited<ReturnType<typeof adminSupportChat>>;

const QUICK = ["Hi, thanks for reaching out. Looking into it now.", "Could you share the errand number?", "Sorted. Anything else?", "Thanks for your patience."];

export function AdminSupportChat({ threadId, initial }: { threadId: string; initial: Data }) {
  const p = initial.person;
  return (
    <div className="mx-auto max-w-[760px]">
      <ChatView
        embedded
        side="support"
        endpoint={`/api/admin/support/${threadId}`}
        initial={initial}
        quickReplies={QUICK}
        placeholder={`Reply to ${p.name}`}
        header={() => (
          <div className="flex items-center gap-3 pb-4">
            <Link href="/admin/support" aria-label="All conversations" className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-sunken">
              <ChevronLeft className="size-6" strokeWidth={2.2} />
            </Link>
            <Avatar name={p.name} size={44} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[16px] font-semibold text-ink">
                {p.name}
                {!p.active ? <span className="ml-2 rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-semibold text-danger-soft-ink">Disabled</span> : null}
              </span>
              <span className="block truncate text-[12.5px] text-muted">{[p.role, p.address, p.email, p.phone ? formatPhoneLocal(p.phone) : null].filter(Boolean).join(" · ")}</span>
            </span>
            {p.phone ? (
              <a href={telLink(p.phone)} className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-primary-soft px-4 text-[13.5px] font-semibold text-primary-soft-ink">
                <Phone className="size-4" /> Call
              </a>
            ) : null}
          </div>
        )}
      />
    </div>
  );
}
