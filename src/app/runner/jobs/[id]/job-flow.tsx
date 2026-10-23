"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CircleAlert,
  Clock3,
  Home,
  KeyRound,
  Landmark,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Receipt,
  Store,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import useSWR from "swr";
import { BankFields, emptyBank, type BankValue } from "@/components/app/bank-form";
import { PageHeader } from "@/components/app/page-header";
import { CategoryThumb } from "@/components/brand/photo";
import { CallButton } from "@/components/call/call-provider";
import { ChatSheet } from "@/components/order/chat-sheet";
import { Confetti, Photo, Timeline } from "@/components/order/parts";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { OtpInput } from "@/components/ui/otp-input";
import { PhotoPicker } from "@/components/ui/photo-picker";
import { Sheet } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { getCategory } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import { naira } from "@/lib/money";
import type { OrderView } from "@/lib/orders/queries";
import { useCountdown } from "../../dashboard";
import { accept, arrived, atShop, complete, confirmPurchase, decline, headOut } from "../../actions";

const ease = [0.22, 1, 0.36, 1] as const;
const STEPS = ["Accept", "Go", "Buy", "Deliver", "Code"];
const stepOf = (s: string) => ({ assigned: 0, to_vendor: 1, at_vendor: 2, on_the_way: 3, arrived: 4, delivered: 5 })[s] ?? 0;

export function JobFlow({ initial, commissionPct }: { initial: OrderView; commissionPct: number }) {
  const router = useRouter();
  const { data, mutate } = useSWR<{ order: OrderView }>(`/api/orders/${initial.id}`, {
    fallbackData: { order: initial },
    refreshInterval: (d) => (d && ["delivered", "cancelled"].includes(d.order.status) ? 0 : 3500),
    // The errand was reassigned or removed — go back to the dashboard (but ride out network blips).
    onError: (err: Error) => {
      if (/not found|access/i.test(err.message)) router.replace("/runner");
    },
  });
  const o = data?.order ?? initial;
  const [pending, start] = useTransition();
  const [chat, setChat] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [done, setDone] = useState(false);
  const step = stepOf(o.status);
  const cat = getCategory(o.category);
  const limit = o.money.budget + o.money.topupTotal;
  const earn = Math.round((o.money.serviceFee * commissionPct) / 100);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success?: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        toast.error((res as { error: string }).error);
        return;
      }
      haptic(12);
      if (success) toast.success(success);
      mutate();
    });

  // Lost the job (reassigned / cancelled)
  if (o.viewerRole !== "runner" && o.viewerRole !== "admin") return null;

  return (
    <div className="pb-48">
      <Confetti fire={done} />
      <div className="px-5">
        <PageHeader
          back="/runner"
          title={`#${o.code}`}
          subtitle={cat.label}
          right={
            o.status !== "delivered" && o.status !== "cancelled" && o.status !== "assigned" ? (
              <div className="flex items-center gap-2">
                <CallButton
                  target={{ orderId: o.id }}
                  peer={{ name: o.resident.firstName || "Customer", subtitle: `Block ${o.drop.block}, House ${o.drop.house}`, image: null, category: null }}
                />
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setChat(true)} className="relative flex h-10 items-center gap-1.5 rounded-full bg-primary-soft px-3.5 text-[13.5px] font-semibold text-primary-soft-ink">
                  <MessageCircle className="size-4" /> Chat
                  {o.unread ? <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-ink ring-2 ring-bg">{o.unread}</span> : null}
                </motion.button>
              </div>
            ) : null
          }
        />
      </div>

      {/* progress */}
      {o.status !== "cancelled" ? (
        <div className="mx-5 mb-4 flex gap-1.5">
          {STEPS.map((name, i) => (
            <div key={name} className="flex-1">
              <span className="block h-1.5 overflow-hidden rounded-full bg-line">
                <motion.span className="block h-full rounded-full bg-primary" initial={false} animate={{ width: i < step ? "100%" : i === step ? "50%" : "0%" }} transition={{ duration: 0.6, ease }} />
              </span>
              <span className={cn("mt-1 block text-center text-[10.5px] font-semibold", i <= step ? "text-ink-2" : "text-faint")}>
                {name === "Buy" && o.kind === "pickup" ? "Collect" : name}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <AnimatePresence mode="wait">
        <motion.div key={o.status} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3, ease }} className="space-y-4 px-5">
          {/* ── header card per status ── */}
          {o.status === "cancelled" ? (
            <div className="card flex flex-col items-center p-8 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-danger-soft text-danger">
                <X className="size-7" />
              </span>
              <p className="mt-4 font-display text-[21px] font-semibold text-ink">Errand cancelled</p>
              <p className="mt-1 text-[14px] text-muted">Don&apos;t buy anything for this one.</p>
              <Button className="mt-6" onClick={() => router.push("/runner")}>
                Back to errands
              </Button>
            </div>
          ) : null}

          {o.status === "delivered" ? (
            <div className="card flex flex-col items-center p-8 text-center">
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 16 }} className="grid size-20 place-items-center rounded-full bg-primary text-primary-ink shadow-[var(--shadow-button)]">
                <Check className="size-10" strokeWidth={3} />
              </motion.span>
              <p className="mt-5 font-display text-[24px] font-bold text-ink">Delivered!</p>
              <p className="mt-1 text-[15px] text-muted">
                You earned <span className="font-semibold text-primary">{naira(earn)}</span> on this errand.
              </p>
              <Button size="lg" className="mt-6" onClick={() => router.push("/runner")}>
                Next errand <ArrowRight className="size-5" />
              </Button>
            </div>
          ) : null}

          {o.status === "assigned" ? <NewJob o={o} earn={earn} /> : null}

          {["to_vendor", "at_vendor"].includes(o.status) ? <WhereToGo o={o} /> : null}

          {o.status === "at_vendor" ? <AtShop o={o} limit={limit} onChange={() => mutate()} /> : null}

          {["on_the_way", "arrived"].includes(o.status) ? <DropOff o={o} /> : null}

          {o.status === "arrived" ? (
            <CodeEntry
              pending={pending}
              onSubmit={(code) =>
                start(async () => {
                  const res = await complete(o.id, code);
                  if (!res.ok) {
                    toast.error(res.error);
                    haptic([30, 50, 30]);
                    return;
                  }
                  haptic([20, 60, 20, 60, 40]);
                  setDone(true);
                  mutate();
                })
              }
            />
          ) : null}

          {/* items checklist for most stages */}
          {["to_vendor", "on_the_way", "arrived"].includes(o.status) ? <ItemsCard o={o} /> : null}

          {o.status !== "assigned" ? (
            <div className="card p-4">
              <Timeline events={o.events} />
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>

      {/* ── action bar ── */}
      {["assigned", "to_vendor", "on_the_way"].includes(o.status) || (o.status === "at_vendor" && (limit === 0 || isPaid(o))) ? (
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px]">
          <div className="safe-bottom border-t border-line/70 bg-bg/90 px-5 pt-3 backdrop-blur-xl">
            {o.status === "assigned" ? (
              <div className="flex gap-2">
                <Button variant="secondary" size="xl" onClick={() => setDeclineOpen(true)} disabled={pending}>
                  Pass
                </Button>
                <Button size="xl" className="flex-1" loading={pending} onClick={() => run(() => accept(o.id), "Accepted — let's go!")}>
                  Accept errand
                </Button>
              </div>
            ) : o.status === "to_vendor" ? (
              <Button size="xl" block loading={pending} onClick={() => run(() => atShop(o.id))}>
                <Store className="size-5" /> {o.collectAs ? "I'm at the shop" : o.kind === "pickup" ? "I'm at the pick-up point" : o.category === "gas" ? "I'm at the gas station" : "I'm at the shop"}
              </Button>
            ) : o.status === "at_vendor" ? (
              <Button size="xl" block loading={pending} onClick={() => run(() => headOut(o.id))}>
                <Navigation className="size-5" /> {limit === 0 ? "Collected — heading out" : "Got everything — heading out"}
              </Button>
            ) : o.status === "on_the_way" ? (
              <Button size="xl" block loading={pending} onClick={() => run(() => arrived(o.id), "Resident notified")}>
                <Home className="size-5" /> I&apos;m at the door
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <DeclineSheet
        open={declineOpen}
        onClose={() => setDeclineOpen(false)}
        pending={pending}
        onConfirm={(reason) =>
          start(async () => {
            const res = await decline(o.id, reason);
            if (!res.ok) return toast.error(res.error);
            toast("Passed — we'll send you the next one");
            router.replace("/runner");
          })
        }
      />

      <ChatSheet
        orderId={o.id}
        open={chat}
        onClose={() => {
          setChat(false);
          mutate();
        }}
        title={`Chat with ${o.resident.firstName || "resident"}`}
        quickReplies={
          o.collectAs
            ? ["I'm at the shop now", "They're still packing it — I'll wait", "The shop says it hasn't been paid", "On my way to you", "I'm at your gate"]
            : ["I'm at the shop now", "They're out of it — any alternative?", "On my way to you", "I'm at your gate"]
        }
      />

    </div>
  );
}

function isPaid(o: OrderView) {
  return o.money.actualCost !== null && (o.money.actualCost === 0 || (o.vendorPayout && ["success", "manual"].includes(o.vendorPayout.status)));
}

function NewJob({ o, earn }: { o: OrderView; earn: number }) {
  const left = useCountdown(o.at.assigned, 180);
  const limit = o.money.budget + o.money.topupTotal;
  return (
    <>
      <div className="overflow-hidden rounded-[28px] bg-surface shadow-[var(--shadow-raised)] ring-[3px] ring-accent">
        <div className="flex items-center justify-between bg-accent px-5 py-3 text-accent-ink">
          <span className="text-[14px] font-bold">New errand for you</span>
          <span className="tnum flex items-center gap-1.5 font-display text-[16px] font-bold">
            <Clock3 className="size-4" /> {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
          </span>
        </div>
        <div className="flex items-center gap-4 border-b border-line p-5">
          <CategoryThumb id={o.category} size={64} radius={16} />
          <div>
            <p className="font-display text-[22px] font-bold leading-tight text-ink">{o.collectAs ? "Collect a paid order" : getCategory(o.category).label}</p>
            <p className="text-[14px] text-ink-2">
              You earn <span className="font-semibold text-ink">{naira(earn)}</span>
            </p>
          </div>
        </div>
        <div className="space-y-3 p-5">
          <Line icon={<Store className="size-4" />} label="From" value={o.kind === "pickup" ? o.pickupFrom ?? "—" : o.vendorName ?? "Any shop in the estate"} />
          <Line icon={<MapPin className="size-4" />} label="To" value={o.deliverTo ?? `Block ${o.drop.block}, House ${o.drop.house}`} />
          <Line icon={<Receipt className="size-4" />} label="Spending limit" value={limit ? naira(limit) : o.collectAs ? "Nothing — the resident paid the shop" : "Nothing to buy"} />
        </div>
      </div>
      <ItemsCard o={o} />
    </>
  );
}

function Line({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-sunken text-ink-2">{icon}</span>
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-muted">{label}</p>
        <p className="text-[15px] font-semibold text-ink">{value}</p>
      </div>
    </div>
  );
}

function WhereToGo({ o }: { o: OrderView }) {
  const where = o.kind === "pickup" ? o.pickupFrom : o.vendorName;
  const eyebrow =
    o.category === "gas" && o.status === "to_vendor"
      ? "First collect the cylinder, then"
      : o.collectAs
        ? "Collect a paid order from"
        : o.kind === "pickup"
          ? "Pick up from"
          : "Buy from";
  return (
    <div className="card p-5">
      <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">{eyebrow}</p>
      <p className="mt-1 font-display text-[22px] font-bold leading-tight text-ink">{where ?? "Any shop in the estate"}</p>
      {o.vendorLocation ? (
        <p className="mt-1 flex items-center gap-1.5 text-[14px] text-ink-2">
          <MapPin className="size-4 text-muted" /> {o.vendorLocation}
        </p>
      ) : null}
      {o.collectAs ? (
        <div className="mt-4 rounded-2xl bg-accent-soft px-4 py-3">
          <p className="text-[12px] font-semibold uppercase tracking-wider text-accent-soft-ink/80">Ask for the order under</p>
          <p className="mt-0.5 font-display text-[19px] font-bold text-accent-soft-ink">{o.collectAs}</p>
          <p className="mt-1 text-[13px] text-accent-soft-ink/90">Order #{o.code}</p>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {o.collectAs ? (
          <span className="flex h-10 items-center gap-1.5 rounded-xl bg-primary-soft px-3.5 text-[13px] font-semibold text-primary-soft-ink">
            <BadgeCheck className="size-4" /> Already paid — don&apos;t pay anything
          </span>
        ) : o.vendorIsPartner && o.kind === "buy" ? (
          <span className="flex h-10 items-center gap-1.5 rounded-xl bg-primary-soft px-3.5 text-[13px] font-semibold text-primary-soft-ink">
            <BadgeCheck className="size-4" /> Partner — paid automatically
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ItemsCard({ o, checklist }: { o: OrderView; checklist?: boolean }) {
  const [ticked, setTicked] = useState<Record<number, boolean>>({});
  if (!o.items.length && !o.notes && !o.photoUrl) return null;
  return (
    <div className="card p-5">
      <p className="mb-3 font-display text-[16px] font-semibold text-ink">{o.kind === "pickup" ? "Details" : "Shopping list"}</p>
      <div className="space-y-1.5">
        {o.items.map((i, idx) => {
          const on = !!ticked[idx];
          return (
            <button
              key={idx}
              type="button"
              onClick={() => checklist && setTicked((t) => ({ ...t, [idx]: !t[idx] }))}
              className={cn("flex w-full items-center gap-3 rounded-xl px-1 py-1.5 text-left", checklist && "hover:bg-surface-2")}
            >
              {checklist ? (
                <motion.span animate={{ scale: on ? [1, 1.2, 1] : 1 }} transition={{ duration: 0.3, ease: "easeOut" }} className={cn("grid size-6 shrink-0 place-items-center rounded-lg border-2", on ? "border-primary bg-primary text-primary-ink" : "border-line-strong")}>
                  {on ? <Check className="size-3.5" strokeWidth={3} /> : null}
                </motion.span>
              ) : (
                <span className="tnum w-7 shrink-0 font-display text-[15px] font-bold text-muted">{i.qty}×</span>
              )}
              <span className={cn("flex-1 text-[15px]", on ? "text-muted line-through" : "text-ink")}>
                {checklist ? `${i.qty}× ` : ""}
                {i.name}
              </span>
              {i.price ? <span className="tnum text-[13px] text-muted">~{naira(i.price * i.qty)}</span> : null}
            </button>
          );
        })}
      </div>
      {o.notes ? <p className="mt-3 rounded-xl bg-accent-soft px-3.5 py-2.5 text-[14px] leading-relaxed text-accent-soft-ink">“{o.notes}”</p> : null}
      {o.photoUrl ? (
        <div className="mt-3">
          <Photo url={o.photoUrl} label="From resident" />
        </div>
      ) : null}
    </div>
  );
}

function AtShop({ o, limit, onChange }: { o: OrderView; limit: number; onChange: () => void }) {
  const [cost, setCost] = useState(0);
  const [receipt, setReceipt] = useState<{ id: string; url: string } | null>(null);
  const [bank, setBank] = useState<BankValue>(emptyBank);
  const [pending, start] = useTransition();
  const payout = o.vendorPayout;
  const topup = o.topup;
  const needsAccount = !o.vendorIsPartner;
  const paid = isPaid(o);

  if (limit === 0 && o.money.actualCost === null) {
    return (
      <>
        <div className="card flex items-center gap-3 p-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-soft-ink">
            <Check className="size-5" />
          </span>
          <p className="text-[14.5px] text-ink-2">
            {o.collectAs ? (
              <>
                Already paid. Ask for the order under <span className="font-semibold text-ink">{o.collectAs}</span>, check it&apos;s sealed, then tap below.
              </>
            ) : (
              "Nothing to pay here. Collect it, then tap below."
            )}
          </p>
        </div>
        <ItemsCard o={o} />
      </>
    );
  }

  // Waiting on the resident to approve extra money
  if (topup && (topup.status === "pending" || topup.status === "approved") && o.money.actualCost === null) {
    return (
      <StatusPanel
        tone="accent"
        icon={<Spinner className="size-7" />}
        title={`Waiting for ${o.resident.firstName || "the resident"}`}
        body={`You asked for ${naira(topup.amount)} more. We'll let you know the moment they answer.`}
      />
    );
  }

  if (payout && o.money.actualCost !== null) {
    if (payout.status === "processing")
      return (
        <StatusPanel
          tone="brand"
          icon={<Landmark className="size-7" />}
          title="Paying the shop…"
          body={`Sending ${naira(payout.amount)} to ${payout.accountName ?? "the shop"}. This usually takes a few seconds.`}
          progress
        />
      );
    if (payout.status === "pending_approval")
      return <StatusPanel tone="accent" icon={<Clock3 className="size-7" />} title="Waiting for admin approval" body={`${naira(payout.amount)} to ${payout.accountName}. The admin has been alerted.`} progress />;
    if (paid)
      return (
        <>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative overflow-hidden rounded-[28px] bg-hero p-6 text-center text-hero-ink shadow-[var(--shadow-raised)]">
            <div className="relative z-10">
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 380, damping: 15 }} className="mx-auto grid size-16 place-items-center rounded-full bg-accent text-accent-ink">
                <Check className="size-8" strokeWidth={3} />
              </motion.span>
              <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">Shop paid</p>
              <p className="tnum mt-1 font-display text-[40px] font-bold leading-none">{naira(payout.amount)}</p>
              <p className="mt-2 text-[14px] text-hero-muted">to {payout.accountName ?? "the shop"}</p>
              <p className="mt-4 text-[12.5px] text-hero-muted">Show this screen to the shop, collect the items and head out.</p>
            </div>
          </motion.div>
          <ItemsCard o={o} checklist />
        </>
      );
    if (payout.status === "failed" || payout.status === "reversed" || payout.status === "rejected") {
      // fall through to the form so the runner can try again
    }
  }

  const over = cost > limit;
  return (
    <>
      <ItemsCard o={o} checklist />
      {payout && ["failed", "reversed", "rejected"].includes(payout.status) ? (
        <div className="flex items-start gap-2.5 rounded-2xl bg-danger-soft px-4 py-3 text-[13.5px] text-danger-soft-ink">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <p>The last transfer didn&apos;t go through{payout.failureReason ? `: ${payout.failureReason}` : ""}. Check the details and try again.</p>
        </div>
      ) : null}
      {topup?.status === "declined" ? (
        <div className="flex items-start gap-2.5 rounded-2xl bg-accent-soft px-4 py-3 text-[13.5px] text-accent-soft-ink">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <p>The resident declined extra money. Stay within {naira(limit)} — remove something or chat with them.</p>
        </div>
      ) : null}
      <div className="card space-y-4 p-5">
        <div className="flex items-end justify-between">
          <p className="font-display text-[17px] font-semibold text-ink">What did it cost?</p>
          <p className="text-[12.5px] text-muted">
            Limit <span className="tnum font-semibold text-ink">{naira(limit)}</span>
          </p>
        </div>
        <MoneyInput size="lg" value={cost} onChange={setCost} invalid={over} />
        <AnimatePresence>
          {over ? (
            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-[13px] font-medium text-accent-soft-ink">
              That&apos;s {naira(cost - limit)} over the limit — we&apos;ll ask {o.resident.firstName || "the resident"} to approve it.
            </motion.p>
          ) : null}
        </AnimatePresence>
        <PhotoPicker value={receipt} onChange={setReceipt} label="Snap the receipt" hint="Or a photo of the items if there's no receipt" />
        {needsAccount && !over ? (
          <div className="rounded-2xl bg-surface-2 p-4">
            <p className="mb-3 text-[14px] font-semibold text-ink">Shop&apos;s bank account</p>
            <BankFields value={bank} onChange={setBank} />
          </div>
        ) : null}
        <Button
          size="xl"
          block
          variant={over ? "accent" : "primary"}
          loading={pending}
          disabled={cost <= 0 || !receipt || (needsAccount && !over && !bank.accountName)}
          onClick={() =>
            start(async () => {
              const res = await confirmPurchase(o.id, {
                actualCost: cost,
                receiptId: receipt?.id ?? null,
                account: needsAccount && !over ? { bankCode: bank.bankCode, bankName: bank.bankName, accountNumber: bank.accountNumber } : null,
              });
              if (!res.ok) return toast.error(res.error);
              haptic(12);
              if (res.data === "topup") toast("Asked the resident to approve the extra");
              onChange();
            })
          }
        >
          {over ? `Ask for ${naira(cost - limit)} more` : cost > 0 ? `Pay shop ${naira(cost)}` : "Enter the amount"}
        </Button>
        {!receipt && cost > 0 ? <p className="-mt-2 text-center text-[12.5px] text-muted">A photo is required before paying.</p> : null}
      </div>
    </>
  );
}

function StatusPanel({ tone, icon, title, body, progress }: { tone: "brand" | "accent"; icon: React.ReactNode; title: string; body: string; progress?: boolean }) {
  return (
    <div className={cn("overflow-hidden rounded-[28px] p-6 text-center", tone === "brand" ? "bg-primary-soft text-primary-soft-ink" : "bg-accent-soft text-accent-soft-ink")}>
      <motion.span animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1.6 }} className="mx-auto grid size-16 place-items-center rounded-full bg-surface/70">
        {icon}
      </motion.span>
      <p className="mt-4 font-display text-[20px] font-bold">{title}</p>
      <p className="mx-auto mt-1 max-w-[300px] text-[14px] leading-relaxed opacity-80">{body}</p>
      {progress ? (
        <div className="mx-auto mt-5 h-1.5 max-w-[220px] overflow-hidden rounded-full bg-surface/60">
          <motion.span className="block h-full w-1/3 rounded-full bg-current" animate={{ x: ["-100%", "300%"] }} transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }} />
        </div>
      ) : null}
    </div>
  );
}

function DropOff({ o }: { o: OrderView }) {
  return (
    <div className="relative overflow-hidden rounded-[28px] bg-hero p-6 text-hero-ink shadow-[var(--shadow-raised)]">
      <div className="relative z-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">{o.status === "arrived" ? "You're at" : "Deliver to"}</p>
        {o.deliverTo ? (
          <p className="mt-2 font-display text-[26px] font-bold leading-tight">{o.deliverTo}</p>
        ) : (
          <p className="mt-2 font-display text-[30px] font-bold leading-tight">
            Block {o.drop.block}
            <span className="text-hero-muted"> · </span>
            House {o.drop.house}
          </p>
        )}
        {o.drop.street || o.drop.landmark ? <p className="mt-1.5 text-[14.5px] text-hero-muted">{[o.drop.street, o.drop.landmark].filter(Boolean).join(" · ")}</p> : null}
        <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
          <Avatar name={o.resident.firstName} size={38} />
          <div className="text-[14px]">
            <p className="font-semibold">{o.resident.firstName || "Resident"}</p>
            <p className="text-[12.5px] text-hero-muted">Use chat to reach them</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CodeEntry({ onSubmit, pending }: { onSubmit: (code: string) => void; pending: boolean }) {
  const [code, setCode] = useState("");
  useEffect(() => {
    if (!pending) setCode((c) => (c.length === 4 ? "" : c));
  }, [pending]);
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent-soft-ink">
          <KeyRound className="size-5" />
        </span>
        <div>
          <p className="font-display text-[17px] font-semibold text-ink">Ask for the delivery code</p>
          <p className="text-[13px] text-muted">Only after they&apos;ve checked everything.</p>
        </div>
      </div>
      <div className="mx-auto mt-5 max-w-[280px]">
        <OtpInput length={4} value={code} onChange={setCode} onComplete={onSubmit} disabled={pending} autoFocus={false} />
      </div>
      <Button size="xl" block className="mt-5" loading={pending} disabled={code.length !== 4} onClick={() => onSubmit(code)}>
        Complete errand
      </Button>
    </div>
  );
}

function DeclineSheet({ open, onClose, onConfirm, pending }: { open: boolean; onClose: () => void; onConfirm: (r: string) => void; pending: boolean }) {
  const reasons = ["Too far right now", "Shop is closed", "Can't carry it", "Taking a break"];
  const [reason, setReason] = useState(reasons[0]);
  return (
    <Sheet open={open} onClose={onClose} title="Pass on this errand?" description="It goes to the next runner. Passing often lowers your priority.">
      <div className="mt-2 grid grid-cols-2 gap-2">
        {reasons.map((r) => (
          <button key={r} onClick={() => setReason(r)} className={cn("rounded-2xl border px-3 py-3 text-[14px] font-medium", reason === r ? "border-ink bg-surface-2 text-ink" : "border-line text-ink-2")}>
            {r}
          </button>
        ))}
      </div>
      <Field className="mt-4">
        <Button variant="danger" size="lg" block loading={pending} onClick={() => onConfirm(reason)}>
          Pass errand
        </Button>
      </Field>
    </Sheet>
  );
}

