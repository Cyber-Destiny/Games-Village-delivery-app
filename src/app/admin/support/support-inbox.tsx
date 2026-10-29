"use client";

import { MessagesSquare } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { AdminHeader, EmptyRow, Panel } from "@/components/admin/ui";
import { PushToggle } from "@/components/app/push";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";
import { formatPhoneLocal } from "@/lib/phone";
import type { SupportInboxRow } from "@/lib/support";
import { timeAgo } from "@/lib/time";

export function SupportInbox({ initial, phone }: { initial: SupportInboxRow[]; phone: string }) {
  const { data } = useSWR<{ threads: SupportInboxRow[] }>("/api/admin/support", { fallbackData: { threads: initial }, refreshInterval: 5000 });
  const threads = data?.threads ?? initial;
  const waiting = threads.filter((t) => t.unread > 0).length;
  return (
    <>
      <AdminHeader
        title="Support"
        description={
          <>
            Chats from residents, runners and shops.{" "}
            {phone ? <>Calls and WhatsApp go to {formatPhoneLocal(phone)}.</> : <>Add a support phone in Settings for calls and WhatsApp.</>}
          </>
        }
      />
      <PushToggle
        className="card mb-6"
        description="Get an alert on this device when a customer messages support or asks for help on an errand."
        unsupportedHint="This browser can't show alerts. On iPhone, add runam.app to your Home Screen and open it from there."
      />
      <Panel title={waiting ? `${waiting} waiting for a reply` : "All conversations"}>
        {threads.length === 0 ? (
          <EmptyRow>
            <MessagesSquare className="mx-auto mb-3 size-8 text-faint" />
            No messages yet. When someone taps “Chat with support”, it shows up here.
          </EmptyRow>
        ) : (
          <ul className="divide-y divide-line">
            {threads.map((t) => (
              <li key={t.id}>
                <Link href={`/admin/support/${t.id}`} className="flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-surface-2">
                  <Avatar name={t.name} size={42} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className={cn("truncate text-[15px] text-ink", t.unread ? "font-bold" : "font-semibold")}>{t.name}</span>
                      <span className="shrink-0 text-[12px] text-faint">{timeAgo(t.at)}</span>
                    </span>
                    <span className="block truncate text-[12.5px] text-muted">{t.role}</span>
                    <span className="mt-0.5 flex items-center justify-between gap-3">
                      <span className={cn("truncate text-[13.5px]", t.unread ? "font-medium text-ink-2" : "text-muted")}>{t.preview}</span>
                      {t.unread ? (
                        <span className="tnum grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-ink">{t.unread}</span>
                      ) : null}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
