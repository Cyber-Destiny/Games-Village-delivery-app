"use client";

import { AnimatePresence, motion } from "motion/react";
import { Bike, LogOut, MessagesSquare } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { PushToggle } from "@/components/app/push";
import { LegalLinks, OffPlatformNote } from "@/components/legal/notes";
import { APP_NAME } from "@/lib/brand";
import { Photo, shopPhoto } from "@/components/brand/photo";
import { Avatar } from "@/components/ui/avatar";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/cn";
import type { VendorPickup, VendorThread } from "@/lib/shop-chat";
import { timeAgo } from "@/lib/time";
import { signOut } from "../(auth)/actions";

type Data = { threads: VendorThread[]; pickups: VendorPickup[] };

const PICKUP_STATUS: Record<string, string> = {
  searching: "Finding a rider",
  assigned: "Rider assigned",
  to_vendor: "Rider on the way",
  at_vendor: "Rider is at your shop",
};

export function ShopInbox({
  shop,
  staffName,
  alsoResident,
  initial,
}: {
  shop: { name: string; image: string | null; category: string };
  staffName: string;
  alsoResident: boolean;
  initial: Data;
}) {
  const { data = initial } = useSWR<Data>("/api/shop-inbox", { fallbackData: initial, refreshInterval: 5000, revalidateOnMount: false });
  const [tab, setTab] = useState<"chats" | "riders">("chats");
  const unread = data.threads.reduce((a, t) => a + (t.unread ? 1 : 0), 0);

  return (
    <main className="pb-16">
      <header className="safe-top px-5 pt-4">
        <div className="flex items-center gap-3">
          <span className="relative block size-12 shrink-0 overflow-hidden rounded-[14px] bg-sunken">
            <Photo src={shopPhoto(shop)} sizes="96px" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-[21px] font-bold leading-tight text-ink">{shop.name}</h1>
            <p className="truncate text-[13px] text-muted">Signed in as {staffName || "staff"}</p>
          </div>
          <form action={signOut}>
            <button aria-label="Sign out" className="grid size-10 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink">
              <LogOut className="size-5" />
            </button>
          </form>
        </div>
        <Segmented
          className="mt-5 w-full"
          value={tab}
          onChange={setTab}
          options={[
            { value: "chats", label: "Chats", count: unread || undefined },
            { value: "riders", label: "Riders coming", count: data.pickups.length || undefined },
          ]}
        />
      </header>

      <AnimatePresence mode="wait" initial={false}>
        {tab === "chats" ? (
          <motion.section key="chats" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="mt-4 px-5">
            {data.threads.length ? (
              <ul className="divide-y divide-line overflow-hidden rounded-[20px] border border-line bg-surface">
                {data.threads.map((t) => (
                  <li key={t.id}>
                    <Link href={`/shop/chats/${t.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2">
                      <Avatar name={t.customer} size={44} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={cn("truncate text-[15px] text-ink", t.unread ? "font-bold" : "font-semibold")}>{t.customer}</span>
                          <span className="shrink-0 text-[11.5px] text-faint">{timeAgo(t.at)}</span>
                        </span>
                        <span className="flex items-center justify-between gap-2">
                          <span className={cn("truncate text-[13.5px]", t.unread ? "font-medium text-ink-2" : "text-muted")}>{t.preview}</span>
                          {t.unread ? (
                            <span className="tnum grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-ink">{t.unread}</span>
                          ) : null}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty icon={<MessagesSquare className="size-6" />} title="No chats yet" body="When a resident messages your shop, it shows up here." />
            )}
          </motion.section>
        ) : (
          <motion.section key="riders" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="mt-4 px-5">
            {data.pickups.length ? (
              <ul className="space-y-3">
                {data.pickups.map((p) => (
                  <li key={p.id} className={cn("rounded-[20px] border bg-surface p-4", p.status === "at_vendor" ? "border-primary" : "border-line")}>
                    <div className="flex items-center justify-between gap-3">
                      <span className={cn("text-[12.5px] font-semibold", p.status === "at_vendor" ? "text-primary" : "text-muted")}>{PICKUP_STATUS[p.status]}</span>
                      <span className="tnum text-[12.5px] text-faint">#{p.code}</span>
                    </div>
                    <p className="mt-1.5 text-[16px] font-semibold text-ink">
                      {p.collectAs ? <>Hand over the order for {p.collectAs}</> : "A runner is coming to buy for a resident"}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted">
                      <Bike className="size-4" /> {p.runner ? `${p.runner} is the rider` : "Rider not assigned yet"} · booked {timeAgo(p.at)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty icon={<Bike className="size-6" />} title="No riders on the way" body="When a customer books a rider to collect from you, you'll see it here." />
            )}
          </motion.section>
        )}
      </AnimatePresence>

      <section className="mx-5 mt-8 overflow-hidden rounded-[20px] border border-line bg-surface">
        <PushToggle description="Get alerted for new messages and riders" />
      </section>
      <OffPlatformNote className="mx-5 mt-4">
        Hand orders only to riders booked in the app, for the name shown in your chat. Deliveries arranged outside {APP_NAME} aren&apos;t covered.
      </OffPlatformNote>
      <LegalLinks className="mt-4" />
      {alsoResident ? (
        <Link href="/home" className="mx-5 mt-3 block text-center text-[13.5px] font-semibold text-primary">
          Switch to your resident account
        </Link>
      ) : null}
    </main>
  );
}

function Empty({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center rounded-[20px] border border-dashed border-line-strong px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-sunken text-muted">{icon}</span>
      <p className="mt-3 font-display text-[17px] font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-[260px] text-[13.5px] text-muted">{body}</p>
    </div>
  );
}
