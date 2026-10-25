"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Receipt } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { naira } from "@/lib/money";
import type { OrderView } from "@/lib/orders/queries";
import { milestoneIndex, type OrderStatus } from "@/lib/orders/status";
import { formatDateTime, formatTime } from "@/lib/time";

const ease = [0.22, 1, 0.36, 1] as const;

const LABELS = ["Placed", "Runner", "Shop", "On the way", "At door", "Done"];

export function Milestones({ status, kind }: { status: OrderStatus; kind: "buy" | "pickup" }) {
  const current = milestoneIndex(status);
  const labels = kind === "pickup" ? ["Placed", "Runner", "Collect", "On the way", "At door", "Done"] : LABELS;
  return (
    <div className="flex items-start">
      {labels.map((label, i) => {
        const done = i < current || status === "delivered";
        const active = i === current && status !== "delivered";
        return (
          <div key={label} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <span className={cn("h-[3px] flex-1 rounded-full", i === 0 ? "opacity-0" : done || active ? "bg-primary" : "bg-line")} />
              <motion.span
                initial={false}
                animate={{ scale: active ? 1.12 : 1 }}
                className={cn(
                  "relative grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors duration-500",
                  done ? "border-primary bg-primary text-primary-ink" : active ? "border-primary bg-surface" : "border-line bg-surface",
                )}
              >
                {done ? (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}>
                    <Check className="size-3.5" strokeWidth={3.2} />
                  </motion.span>
                ) : active ? (
                  <>
                    <span className="absolute inset-0 animate-[var(--animate-pulse-ring)] rounded-full bg-primary/40" />
                    <span className="size-2 rounded-full bg-primary" />
                  </>
                ) : null}
              </motion.span>
              <span className={cn("h-[3px] flex-1 rounded-full", i === labels.length - 1 ? "opacity-0" : done ? "bg-primary" : "bg-line")} />
            </div>
            <span className={cn("mt-1.5 text-center text-[10.5px] font-semibold leading-tight", done || active ? "text-ink-2" : "text-faint")}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function DeliveryCode({ code, compact }: { code: string; compact?: boolean }) {
  return (
    <div className="flex justify-center gap-2.5">
      {code.split("").map((d, i) => (
        <motion.span
          key={i}
          initial={{ rotateX: -90, opacity: 0, y: 10 }}
          animate={{ rotateX: 0, opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + i * 0.09, type: "spring", stiffness: 300, damping: 20 }}
          style={{ transformPerspective: 400 }}
          className={cn(
            "grid place-items-center rounded-2xl bg-white font-display font-bold text-hero shadow-[0_6px_16px_-6px_rgb(0_0_0/0.4)]",
            compact ? "h-14 w-12 text-[28px]" : "h-[72px] w-[58px] text-[38px]",
          )}
        >
          {d}
        </motion.span>
      ))}
    </div>
  );
}

export function ItemsList({ order }: { order: OrderView }) {
  return (
    <div className="space-y-2.5">
      {order.collectAs ? (
        <div className="flex items-baseline justify-between gap-3 text-[14.5px]">
          <span className="text-muted">Order under</span>
          <span className="font-semibold text-ink">{order.collectAs}</span>
        </div>
      ) : null}
      {order.items.map((i, idx) => (
        <div key={idx} className="flex items-baseline justify-between gap-3 text-[14.5px]">
          <span className="text-ink">
            <span className="tnum mr-2 font-semibold text-muted">{i.qty}×</span>
            {i.name}
          </span>
          {i.price ? <span className="tnum shrink-0 text-[13.5px] text-muted">{naira(i.price * i.qty)}</span> : null}
        </div>
      ))}
      {order.notes ? <p className="rounded-xl bg-surface-2 px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink-2">“{order.notes}”</p> : null}
      {order.photoUrl ? <Photo url={order.photoUrl} label="Photo" /> : null}
    </div>
  );
}

export function Photo({ url, label }: { url: string; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="group relative block overflow-hidden rounded-2xl ring-1 ring-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={label} className="h-24 w-24 object-cover transition-transform duration-500 group-hover:scale-105" />
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-1.5 pt-4 text-left text-[11px] font-semibold text-white">{label}</span>
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[90] grid place-items-center bg-black/85 p-5 backdrop-blur"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <motion.img initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} src={url} alt={label} className="max-h-[85dvh] max-w-full rounded-2xl" />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

export function MoneyBreakdown({ order, perspective }: { order: OrderView; perspective: "resident" | "admin" }) {
  const m = order.money;
  const paid = m.total + m.topupTotal;
  return (
    <div className="space-y-1">
      {m.budget > 0 ? <MoneyRow label={order.kind === "buy" ? "Items budget" : "To pay on collection"} value={naira(m.budget)} /> : null}
      {m.topupTotal > 0 ? <MoneyRow label="Extra approved" value={naira(m.topupTotal)} /> : null}
      <MoneyRow
        label={order.collectAs ? "Delivery fee" : "Service fee"}
        value={
          m.loyaltyFree ? (
            <span className="flex items-center gap-2">
              <span className="text-faint line-through">{naira(m.serviceFee)}</span>
              <span className="font-semibold text-primary">Free</span>
            </span>
          ) : (
            naira(m.serviceFee)
          )
        }
      />
      <div className="my-2 border-t border-dashed border-line-strong" />
      <MoneyRow label={<span className="font-semibold text-ink">Paid</span>} value={<span className="font-semibold">{naira(paid)}</span>} />
      {m.walletApplied > 0 ? <MoneyRow label="From wallet" value={naira(m.walletApplied)} muted /> : null}
      {m.actualCost !== null && m.budget + m.topupTotal > 0 ? (
        <>
          <MoneyRow label="Spent at the shop" value={naira(m.actualCost)} muted />
          {order.status === "delivered" && (m.changeRefunded ?? 0) > 0 ? (
            <div className="mt-2 flex items-center justify-between rounded-xl bg-primary-soft px-3 py-2.5 text-[14px] font-semibold text-primary-soft-ink">
              <span>Change to wallet</span>
              <span className="tnum">+{naira(m.changeRefunded)}</span>
            </div>
          ) : perspective === "resident" && order.status !== "delivered" && order.status !== "cancelled" ? (
            <p className="pt-1 text-[12.5px] text-muted">{naira(m.budget + m.topupTotal - m.actualCost)} change goes to your wallet on delivery.</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function MoneyRow({ label, value, muted }: { label: React.ReactNode; value: React.ReactNode; muted?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 py-1 text-[14.5px]", muted ? "text-muted" : "text-ink-2")}>
      <span>{label}</span>
      <span className="tnum text-ink">{value}</span>
    </div>
  );
}

/** Order activity. `collapsible={false}` drops the toggle header, for when the parent already titles it. */
export function Timeline({ events, defaultOpen = false, collapsible = true }: { events: OrderView["events"]; defaultOpen?: boolean; collapsible?: boolean }) {
  const [toggled, setOpen] = useState(defaultOpen);
  const open = !collapsible || toggled;
  const list = useMemo(() => [...events].reverse(), [events]);
  return (
    <div>
      {collapsible ? (
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between py-1 text-left">
          <span className="font-display text-[16px] font-semibold text-ink">Activity</span>
          <motion.span animate={{ rotate: open ? 180 : 0 }}>
            <ChevronDown className="size-5 text-muted" />
          </motion.span>
        </button>
      ) : null}
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={collapsible ? { height: 0, opacity: 0 } : false}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease }}
            className="overflow-hidden"
          >
            <ol className={cn("relative ml-2 border-l-2 border-line pl-5", collapsible && "mt-3")}>
              {list.map((e, i) => (
                <li key={e.id} className="relative pb-4 last:pb-1">
                  <span className={cn("absolute -left-[27px] top-1 size-3 rounded-full ring-4 ring-surface", i === 0 ? "bg-primary" : "bg-line-strong")} />
                  <p className="text-[14px] leading-snug text-ink">{e.message}</p>
                  <p className="text-[12px] text-muted">{formatTime(e.createdAt)}</p>
                </li>
              ))}
            </ol>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function Confetti({ fire }: { fire: boolean }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }).map((_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 520,
        y: -(160 + Math.random() * 320),
        r: (Math.random() - 0.5) * 720,
        s: 0.6 + Math.random() * 0.8,
        c: ["var(--accent)", "var(--primary)", "#ff8a65", "#7aa7ff", "#b59bff"][i % 5],
        d: Math.random() * 0.15,
        shape: i % 3,
      })),
    [],
  );
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[38%] z-[70] flex justify-center">
      <AnimatePresence>
        {fire
          ? pieces.map((p) => (
              <motion.span
                key={p.id}
                initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: p.s }}
                animate={{ x: p.x, y: [0, p.y, p.y + 520], opacity: [1, 1, 0], rotate: p.r }}
                transition={{ duration: 2.2, delay: p.d, ease: [0.15, 0.6, 0.4, 1], times: [0, 0.35, 1] }}
                className={cn("absolute block", p.shape === 0 ? "h-3 w-2 rounded-[2px]" : p.shape === 1 ? "size-2.5 rounded-full" : "h-1.5 w-3.5 rounded-full")}
                style={{ background: p.c }}
              />
            ))
          : null}
      </AnimatePresence>
    </div>
  );
}

export function ReceiptLink({ url }: { url: string }) {
  return (
    <a href={url} target="_blank" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-primary">
      <Receipt className="size-4" /> View receipt
    </a>
  );
}

export function DeliveredStamp({ at }: { at: string }) {
  return <span className="text-[12.5px] text-muted">Delivered {formatDateTime(at)}</span>;
}
