"use client";

import { motion } from "motion/react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CategoryThumb } from "@/components/brand/photo";
import { StatusBadge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { naira } from "@/lib/money";
import type { OrderCardData } from "@/lib/orders/queries";
import { formatDate, formatTime } from "@/lib/time";

const ACTIVE = ["awaiting_payment", "searching", "assigned", "to_vendor", "at_vendor", "on_the_way", "arrived"];

export function OrdersList({ orders }: { orders: OrderCardData[] }) {
  const active = useMemo(() => orders.filter((o) => ACTIVE.includes(o.status)), [orders]);
  const past = useMemo(() => orders.filter((o) => !ACTIVE.includes(o.status)), [orders]);
  const [tab, setTab] = useState<"active" | "past">(active.length ? "active" : "past");
  const list = tab === "active" ? active : past;

  return (
    <div>
      <Segmented
        className="w-full"
        value={tab}
        onChange={setTab}
        options={[
          { value: "active", label: "In progress", count: active.length },
          { value: "past", label: "Past" },
        ]}
      />
      {list.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center px-6 py-16 text-center">
          <EmptyArt />
          <p className="mt-5 font-display text-[20px] font-semibold text-ink">{tab === "active" ? "Nothing running right now" : "No past errands yet"}</p>
          <p className="mt-1 max-w-[260px] text-[14px] text-muted">When you send a runner out, you&apos;ll track it here.</p>
          <LinkButton href="/new" className="mt-6">
            Start an errand
          </LinkButton>
        </motion.div>
      ) : (
        <motion.ul initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.04 } } }} className="mt-4 space-y-2.5">
          {list.map((o) => (
            <motion.li key={o.id} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
              <Link href={`/orders/${o.id}`}>
                <motion.div whileTap={{ scale: 0.985 }} className="card flex items-center gap-3.5 p-3.5">
                  <CategoryThumb id={o.category} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[15px] font-semibold text-ink">{o.title}</p>
                      <span className="tnum shrink-0 text-[14px] font-semibold text-ink">{naira(o.total)}</span>
                    </div>
                    <p className="truncate text-[12.5px] text-muted">
                      {o.place ? `${o.place} · ` : ""}
                      {formatDate(o.createdAt)}, {formatTime(o.createdAt)}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <StatusBadge status={o.status} />
                      {o.status === "delivered" && !o.rated ? <span className="text-[12px] font-semibold text-primary">Rate ★</span> : null}
                    </div>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-faint" />
                </motion.div>
              </Link>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
  );
}

function EmptyArt() {
  return (
    <svg width="132" height="104" viewBox="0 0 132 104" fill="none" aria-hidden>
      <ellipse cx="66" cy="94" rx="46" ry="6" fill="var(--line)" />
      <rect x="30" y="22" width="72" height="66" rx="16" fill="var(--surface)" stroke="var(--line-strong)" strokeWidth="2" />
      <rect x="44" y="38" width="44" height="6" rx="3" fill="var(--line)" />
      <rect x="44" y="52" width="32" height="6" rx="3" fill="var(--line)" />
      <rect x="44" y="66" width="38" height="6" rx="3" fill="var(--line)" />
      <circle cx="98" cy="24" r="14" fill="var(--accent)" />
      <path d="m92 24 4 4 8-8" stroke="var(--accent-ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
