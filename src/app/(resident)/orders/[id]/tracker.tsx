"use client";

import { AnimatePresence, motion } from "motion/react";
import { CircleAlert, Clock3, CreditCard, Home, LifeBuoy, MapPin, MessageCircle, MoreHorizontal, ShieldCheck, Store, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import useSWR from "swr";
import { CategoryThumb } from "@/components/brand/photo";
import { EstateMap, mapProgress } from "@/components/brand/estate-map";
import { PageHeader } from "@/components/app/page-header";
import { CallButton } from "@/components/call/call-provider";
import { ChatSheet } from "@/components/order/chat-sheet";
import { Confetti, DeliveryCode, ItemsList, Milestones, MoneyBreakdown, Photo, Timeline } from "@/components/order/parts";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { StarInput, StarRating } from "@/components/ui/stars";
import { toast } from "@/components/ui/toast";
import { APP_NAME } from "@/lib/brand";
import { getCategory } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import { naira } from "@/lib/money";
import type { OrderView } from "@/lib/orders/queries";
import { RESIDENT_CANCELLABLE, statusCopy } from "@/lib/orders/status";
import { formatDateTime } from "@/lib/time";
import { answerTopup, cancelErrand, payNow, rateErrand } from "../../actions";

const ease = [0.22, 1, 0.36, 1] as const;
const FINAL = ["delivered", "cancelled"];
const CANCEL_REASONS = ["Changed my mind", "Ordered by mistake", "Taking too long", "Got it elsewhere"];
const RATING_TAGS = ["Fast", "Polite", "Careful with items", "Good communication", "Followed notes"];

export function Tracker({ initial }: { initial: OrderView }) {
  const router = useRouter();
  const params = useSearchParams();
  const { data, mutate } = useSWR<{ order: OrderView }>(`/api/orders/${initial.id}`, {
    fallbackData: { order: initial },
    refreshInterval: (d) => (d && FINAL.includes(d.order.status) ? 0 : 4000),
  });
  const order = data?.order ?? initial;
  const cat = getCategory(order.category);
  const copy = statusCopy({
    status: order.status,
    kind: order.kind,
    category: order.category,
    runnerName: order.runner?.firstName,
    place: order.kind === "pickup" ? order.pickupFrom || order.vendorName : order.vendorName,
    collect: !!order.collectAs,
    awaitingShop: order.awaitingShop,
  });
  const { progress, stage } = mapProgress(order.status, order.kind);

  const [chatOpen, setChatOpen] = useState(params.get("chat") === "1");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [pending, start] = useTransition();
  const prevStatus = useRef(order.status);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  // Celebrate the moment it flips to delivered, then ask for a rating.
  useEffect(() => {
    if (prevStatus.current !== order.status) {
      haptic(order.status === "delivered" ? [20, 60, 20, 60, 40] : 12);
      if (order.status === "delivered") {
        setConfetti(true);
        setTimeout(() => setConfetti(false), 2600);
        if (!order.rating) setTimeout(() => setRateOpen(true), 1400);
      }
      prevStatus.current = order.status;
    }
  }, [order.status, order.rating]);

  useEffect(() => {
    if (params.get("paid") === "1") toast.success("Payment received", "We're finding you a runner now.");
    else if (params.get("new") === "1") toast.success("Errand placed", "We're finding you a runner now.");
    if (params.get("paid") || params.get("new")) router.replace(`/orders/${initial.id}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingTopup = order.topup && (order.topup.status === "pending" || order.topup.status === "approved") ? order.topup : null;
  const showCode = !!order.deliveryCode && (order.status === "on_the_way" || order.status === "arrived");
  const canCancel = RESIDENT_CANCELLABLE.includes(order.status);
  const live = !FINAL.includes(order.status) && order.status !== "awaiting_payment";

  return (
    <div className="pb-16">
      <Confetti fire={confetti} />
      <div className="px-5">
        <PageHeader
          back="/orders"
          title={`Errand #${order.code}`}
          subtitle={formatDateTime(order.at.created)}
          right={
            <button onClick={() => setMenuOpen(true)} aria-label="More" className="grid size-10 place-items-center rounded-full hover:bg-sunken">
              <MoreHorizontal className="size-5" />
            </button>
          }
        />
      </div>

      {/* map + status */}
      <section className="px-5">
        <div className="card overflow-hidden p-2">
          <div className="relative">
            <EstateMap progress={progress} stage={stage} height={order.status === "cancelled" ? 140 : 230} className={cn(order.status === "cancelled" && "opacity-50 grayscale")} />
            {live ? (
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-surface/90 px-2.5 py-1 text-[11.5px] font-semibold text-ink-2 shadow backdrop-blur">
                <span className="relative flex size-1.5">
                  <span className="absolute inset-0 animate-[var(--animate-pulse-ring)] rounded-full bg-primary" />
                  <span className="relative size-1.5 rounded-full bg-primary" />
                </span>
                Live status
              </span>
            ) : null}
          </div>
          <div className="px-3 pb-3 pt-4">
            <div className="flex items-center justify-between gap-2">
              <StatusBadge status={order.status} label={order.awaitingShop ? "Waiting for shop" : undefined} />
              {order.status === "delivered" && order.at.delivered ? <span className="text-[12px] text-muted">{formatDateTime(order.at.delivered)}</span> : null}
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={copy.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35, ease }}>
                <h2 className="mt-3 font-display text-[25px] font-bold leading-tight text-ink">{copy.title}</h2>
                <p className="mt-1 text-[14.5px] text-muted">{order.status === "cancelled" && order.cancelReason ? order.cancelReason : copy.line}</p>
              </motion.div>
            </AnimatePresence>
            {order.status !== "cancelled" && order.status !== "awaiting_payment" ? (
              <div className="mt-5">
                <Milestones status={order.status} kind={order.kind} />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* waiting for the shop to confirm the payment reached them */}
      {order.awaitingShop && order.vendorId ? (
        <section className="mx-5 mt-4 rounded-[24px] border border-line bg-surface p-5">
          <p className="font-semibold text-ink">{order.vendorName ?? "The shop"} is checking your payment</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-muted">
            No rider is sent until they confirm it reached them, so nobody waits at the counter. Taking long? Message them, or cancel to get the delivery fee back.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="soft" size="sm" onClick={() => router.push(`/chat/${order.vendorId}`)}>
              <MessageCircle className="size-4" /> Message {order.vendorName ?? "the shop"}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setCancelOpen(true)}>
              Cancel errand
            </Button>
          </div>
        </section>
      ) : null}

      {/* still searching after a few minutes */}
      <AnimatePresence>
        {order.status === "searching" && !order.awaitingShop && order.at.paid && now - new Date(order.at.paid).getTime() > 3 * 60 * 1000 ? (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mx-5 mt-4 rounded-[24px] border border-line bg-surface p-5">
            <p className="font-semibold text-ink">All our runners are busy right now</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-muted">You&apos;re in the queue — the next free runner gets your errand automatically. Prefer not to wait? Cancel for a full refund to your wallet.</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => setCancelOpen(true)}>
              Cancel errand
            </Button>
          </motion.section>
        ) : null}
      </AnimatePresence>

      {/* awaiting payment */}
      {order.status === "awaiting_payment" ? (
        <section className="mx-5 mt-4 rounded-[24px] bg-accent-soft p-5">
          <div className="flex items-start gap-3">
            <CreditCard className="mt-0.5 size-5 text-accent-soft-ink" />
            <div className="flex-1">
              <p className="font-semibold text-accent-soft-ink">Payment not completed</p>
              <p className="mt-0.5 text-[13.5px] text-accent-soft-ink/80">Your errand starts as soon as payment goes through.</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              className="flex-1"
              loading={pending}
              onClick={() =>
                start(async () => {
                  const res = await payNow(order.id);
                  if (!res.ok) return toast.error(res.error);
                  window.location.href = res.data.payUrl;
                })
              }
            >
              Pay {naira(order.money.total - order.money.walletApplied)}
            </Button>
            <Button variant="secondary" onClick={() => setCancelOpen(true)}>
              Cancel
            </Button>
          </div>
        </section>
      ) : null}

      {/* top-up request */}
      <AnimatePresence>
        {pendingTopup && order.status === "at_vendor" ? (
          <motion.section
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-5 mt-4 overflow-hidden rounded-[24px] bg-surface shadow-[var(--shadow-raised)] ring-2 ring-accent"
          >
            <div className="flex items-center gap-2 bg-accent px-5 py-2.5 text-[13px] font-bold text-accent-ink">
              <CircleAlert className="size-4" /> Your runner needs a bit more
            </div>
            <div className="p-5">
              <p className="text-[15px] leading-relaxed text-ink-2">
                {pendingTopup.reason ?? "The items cost more than your budget"}. Approve an extra{" "}
                <span className="font-display text-[17px] font-bold text-ink">{naira(pendingTopup.amount)}</span> or ask them to remove something.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await answerTopup(pendingTopup.id, false);
                      if (!res.ok) return toast.error(res.error);
                      toast("Told your runner to stay within budget");
                      mutate();
                    })
                  }
                >
                  No, adjust
                </Button>
                <Button
                  variant="accent"
                  loading={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await answerTopup(pendingTopup.id, true);
                      if (!res.ok) return toast.error(res.error);
                      if (res.data.payUrl) window.location.href = res.data.payUrl;
                      else {
                        toast.success("Approved from your wallet");
                        mutate();
                      }
                    })
                  }
                >
                  Approve {naira(pendingTopup.amount)}
                </Button>
              </div>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      {/* delivery code */}
      <AnimatePresence>
        {showCode ? (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="relative mx-5 mt-4 overflow-hidden rounded-[26px] bg-hero px-5 pb-6 pt-5 text-center text-hero-ink shadow-[var(--shadow-raised)]"
          >
            <div className="relative z-10">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">Your delivery code</p>
              <div className="mt-4">
                <DeliveryCode code={order.deliveryCode!} />
              </div>
              <p className="mx-auto mt-4 flex max-w-[280px] items-start justify-center gap-1.5 text-[13px] leading-snug text-hero-muted">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" />
                Only share it once you&apos;ve checked everything. It completes the errand. Never pay the runner directly.
              </p>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>

      {/* runner */}
      {order.runner && order.status !== "cancelled" ? (
        <section className="mx-5 mt-4">
          <div className="card flex items-center gap-3.5 p-4">
            <Avatar name={order.runner.name} size={50} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[17px] font-semibold text-ink">{order.runner.name}</p>
              <div className="flex items-center gap-2 text-[12.5px] text-muted">
                <StarRating value={order.runner.rating} />
                {order.runner.tag ? <span>· Bag {order.runner.tag}</span> : null}
              </div>
            </div>
            {["assigned", "to_vendor", "at_vendor", "on_the_way", "arrived"].includes(order.status) ? (
              <CallButton
                target={{ orderId: order.id }}
                peer={{ name: order.runner.firstName || "Your runner", subtitle: `Your runner · #${order.code}`, image: null, category: null }}
                className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-soft-ink disabled:opacity-50"
              />
            ) : null}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setChatOpen(true)}
              className="relative flex h-11 items-center gap-2 rounded-2xl bg-primary-soft px-4 text-[14px] font-semibold text-primary-soft-ink"
            >
              <MessageCircle className="size-[18px]" /> Chat
              {order.unread > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-ink ring-2 ring-surface">{order.unread}</span>
              ) : null}
            </motion.button>
          </div>
        </section>
      ) : null}

      {/* rating */}
      {order.status === "delivered" ? (
        <section className="mx-5 mt-4">
          {order.rating ? (
            <div className="card flex items-center justify-between p-4">
              <span className="text-[14px] text-ink-2">You rated this errand</span>
              <span className="flex gap-0.5 text-accent">{"★".repeat(order.rating.rating)}</span>
            </div>
          ) : (
            <motion.button whileTap={{ scale: 0.98 }} onClick={() => setRateOpen(true)} className="card flex w-full items-center justify-between p-4 text-left">
              <span>
                <span className="block font-semibold text-ink">How did {order.runner?.firstName ?? "it"} do?</span>
                <span className="block text-[13px] text-muted">Your rating keeps the service sharp.</span>
              </span>
              <span className="text-[22px] tracking-tight text-accent">★★★★★</span>
            </motion.button>
          )}
          <Link
            href={order.collectAs && order.vendorId ? `/collect?vendor=${order.vendorId}` : `/new?from=${order.id}`}
            className="mt-3 flex h-12 items-center justify-center rounded-2xl border border-line bg-surface text-[14.5px] font-semibold text-ink"
          >
            Order this again
          </Link>
        </section>
      ) : null}

      {/* details */}
      <section className="mx-5 mt-4">
        <div className="card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
            <CategoryThumb id={order.category} size={44} />
            <div className="min-w-0">
              <p className="font-display text-[16px] font-semibold text-ink">{order.collectAs ? "Paid order pickup" : cat.label}</p>
              <p className="flex items-center gap-1 truncate text-[13px] text-ink-2">
                {order.kind === "pickup" ? <MapPin className="size-3.5" /> : <Store className="size-3.5" />}
                {order.kind === "pickup" ? `From ${order.pickupFrom ?? order.vendorName ?? "—"}` : order.vendorName ?? "Any shop in the estate"}
              </p>
            </div>
            {order.collectAs && order.vendorId ? (
              <Link
                href={`/chat/${order.vendorId}`}
                className="ml-auto flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary-soft px-3.5 text-[13px] font-semibold text-primary-soft-ink"
              >
                <MessageCircle className="size-4" /> Chat
              </Link>
            ) : null}
          </div>
          <div className="p-4">
            <ItemsList order={order} />
            <div className="mt-4 flex items-center gap-2 border-t border-line pt-3.5 text-[13.5px] text-ink-2">
              <Home className="size-4 text-muted" />
              {order.deliverTo ?? `Block ${order.drop.block}, House ${order.drop.house}`}
              {order.drop.landmark && !order.deliverTo ? <span className="truncate text-muted">· {order.drop.landmark}</span> : null}
            </div>
          </div>
        </div>
      </section>

      {/* money */}
      <section className="mx-5 mt-4">
        <div className="card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-display text-[16px] font-semibold text-ink">Payment</h3>
            {order.receiptUrl ? null : order.status === "at_vendor" ? (
              <span className="flex items-center gap-1 text-[12.5px] text-muted">
                <Clock3 className="size-3.5" /> {order.kind === "pickup" ? "Collecting now" : "Buying now"}
              </span>
            ) : null}
          </div>
          <MoneyBreakdown order={order} perspective="resident" />
          {order.receiptUrl || order.deliveryPhotoUrl ? (
            <div className="mt-4 flex flex-wrap gap-3 border-t border-line pt-4">
              {order.receiptUrl ? <Photo url={order.receiptUrl} label="Receipt" /> : null}
              {order.deliveryPhotoUrl ? <Photo url={order.deliveryPhotoUrl} label="Proof of delivery" /> : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-5 mt-4">
        <div className="card p-4">
          <Timeline events={order.events} />
        </div>
      </section>

      {/* menu */}
      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Errand options">
        <div className="space-y-2">
          {order.runner ? (
            <MenuRow
              icon={<MessageCircle className="size-5" />}
              label="Chat with your runner"
              onClick={() => {
                setMenuOpen(false);
                setChatOpen(true);
              }}
            />
          ) : null}
          <MenuRow
            icon={<LifeBuoy className="size-5" />}
            label="Get help with this errand"
            sub={`Chat privately with the ${APP_NAME} team`}
            onClick={() => {
              setMenuOpen(false);
              router.push(`/support?about=${order.code}`);
            }}
          />
          {canCancel ? (
            <MenuRow
              icon={<X className="size-5" />}
              label="Cancel errand"
              danger
              sub={order.status === "awaiting_payment" ? undefined : "Full refund to your wallet"}
              onClick={() => {
                setMenuOpen(false);
                setCancelOpen(true);
              }}
            />
          ) : null}
        </div>
      </Sheet>

      <CancelSheet
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={(reason) =>
          start(async () => {
            const res = await cancelErrand(order.id, reason);
            if (!res.ok) return toast.error(res.error);
            setCancelOpen(false);
            toast.success("Errand cancelled", order.status === "awaiting_payment" ? undefined : "Your money is back in your wallet.");
            mutate();
            router.refresh();
          })
        }
        pending={pending}
      />

      <RateSheet
        open={rateOpen}
        onClose={() => setRateOpen(false)}
        runnerName={order.runner?.firstName ?? "your runner"}
        onSubmit={(rating, tags, comment) =>
          start(async () => {
            const res = await rateErrand(order.id, rating, tags, comment);
            if (!res.ok) return toast.error(res.error);
            setRateOpen(false);
            toast.success("Thanks for the feedback!");
            mutate();
          })
        }
        pending={pending}
      />

      <ChatSheet
        orderId={order.id}
        open={chatOpen}
        onClose={() => {
          setChatOpen(false);
          mutate();
        }}
        title={order.runner ? `Chat with ${order.runner.firstName}` : "Support"}
        quickReplies={["I'm home", "Please call at the gate", "Leave it with security", "Any substitute is fine"]}
        disabled={order.status === "cancelled"}
      />
    </div>
  );
}

function MenuRow({ icon, label, sub, onClick, danger }: { icon: React.ReactNode; label: string; sub?: string; onClick: () => void; danger?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn("flex w-full items-center gap-3.5 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-sunken/60", danger ? "text-danger" : "text-ink")}
    >
      <span className={cn("grid size-10 place-items-center rounded-xl", danger ? "bg-danger-soft" : "bg-sunken")}>{icon}</span>
      <span>
        <span className="block text-[15px] font-semibold">{label}</span>
        {sub ? <span className="block text-[12.5px] text-muted">{sub}</span> : null}
      </span>
    </motion.button>
  );
}

function CancelSheet({ open, onClose, onConfirm, pending }: { open: boolean; onClose: () => void; onConfirm: (reason: string) => void; pending: boolean }) {
  const [reason, setReason] = useState(CANCEL_REASONS[0]);
  return (
    <Sheet open={open} onClose={onClose} title="Cancel this errand?" description="If you've paid, the full amount goes back to your wallet right away.">
      <div className="mt-2 space-y-2">
        {CANCEL_REASONS.map((r) => (
          <button
            key={r}
            onClick={() => setReason(r)}
            className={cn(
              "flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left text-[15px] font-medium transition-colors",
              reason === r ? "border-ink bg-surface-2 text-ink" : "border-line text-ink-2",
            )}
          >
            {r}
            <span className={cn("grid size-5 place-items-center rounded-full border-2", reason === r ? "border-ink" : "border-line-strong")}>
              {reason === r ? <motion.span layoutId="cancel-dot" className="size-2.5 rounded-full bg-ink" /> : null}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={onClose}>
          Keep it
        </Button>
        <Button variant="danger" loading={pending} onClick={() => onConfirm(reason)}>
          Cancel errand
        </Button>
      </div>
    </Sheet>
  );
}

function RateSheet({
  open,
  onClose,
  runnerName,
  onSubmit,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  runnerName: string;
  onSubmit: (rating: number, tags: string[], comment: string) => void;
  pending: boolean;
}) {
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const labels = ["", "Not good", "Could be better", "Okay", "Great", "Excellent!"];
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="pt-2 text-center">
        <h2 className="font-display text-[23px] font-bold text-ink">How did {runnerName} do?</h2>
        <p className="mt-1 text-[14px] text-muted">Ratings help us reward great runners.</p>
        <div className="mt-6">
          <StarInput value={rating} onChange={setRating} />
        </div>
        <AnimatePresence mode="wait">
          <motion.p key={rating} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-2 h-6 font-display text-[16px] font-semibold text-ink-2">
            {labels[rating]}
          </motion.p>
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {rating > 0 ? (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
            <div className="flex flex-wrap justify-center gap-2 pt-5">
              {RATING_TAGS.map((t) => {
                const on = tags.includes(t);
                return (
                  <motion.button
                    key={t}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setTags((s) => (on ? s.filter((x) => x !== t) : [...s, t]))}
                    className={cn("h-9 rounded-full border px-3.5 text-[13px] font-medium transition-colors", on ? "border-primary bg-primary-soft text-primary-soft-ink" : "border-line text-ink-2")}
                  >
                    {t}
                  </motion.button>
                );
              })}
            </div>
            <Textarea className="mt-4" rows={2} placeholder="Anything else? (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
            <Button size="lg" block className="mt-4" loading={pending} onClick={() => onSubmit(rating, tags, comment)}>
              Submit rating
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Sheet>
  );
}
