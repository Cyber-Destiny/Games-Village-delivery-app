"use client";

import { AnimatePresence, motion } from "motion/react";
import { Bike, Check, ChevronLeft, Home, Phone, ShieldCheck, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ShopContactSheet } from "@/components/app/shop-contact-sheet";
import { CategoryArt, tintFor } from "@/components/brand/category-art";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { APP_NAME } from "@/lib/brand";
import type { CategoryId } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import { naira } from "@/lib/money";
import { computeQuote } from "@/lib/orders/quote";
import type { Shop } from "@/lib/resident";
import { placeErrand } from "../actions";

type Address = { block: string; house: string; street: string; landmark: string };

type Props = {
  shop: Shop;
  fees: Record<CategoryId, number>;
  loyaltyEvery: number;
  paidCount: number;
  walletBalance: number;
  open: boolean;
  hours: string;
  name: string;
  address: Address;
};

const rise = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 320, damping: 30 } } } as const;

export function CollectForm(props: Props) {
  const { shop } = props;
  const router = useRouter();
  const [collectAs, setCollectAs] = useState(props.name);
  const [what, setWhat] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [addr, setAddr] = useState(props.address);
  const [editAddr, setEditAddr] = useState(!props.address.block || !props.address.house);
  const [useWallet, setUseWallet] = useState(props.walletBalance > 0);
  const [contactOpen, setContactOpen] = useState(false);
  const [pending, start] = useTransition();

  const quote = computeQuote(
    { fees: props.fees, loyaltyEvery: props.loyaltyEvery },
    { category: "pickup", budget: 0, walletBalance: props.walletBalance, useWallet, paidCount: props.paidCount },
  );

  const error = !props.open
    ? `Closed right now · ${props.hours}`
    : !collectAs.trim()
      ? "Add the name the order is under"
      : !addr.block.trim() || !addr.house.trim()
        ? "Add your block and house number"
        : !confirmed
          ? "Confirm you've paid the shop"
          : null;

  function submit() {
    if (error) return toast.error(error);
    start(async () => {
      const res = await placeErrand({
        category: "pickup",
        vendorId: shop.id,
        vendorName: shop.name,
        vendorLocation: null,
        pickupFrom: shop.name,
        deliverTo: null,
        collectAs: collectAs.trim(),
        items: [],
        notes: what.trim() || null,
        photoId: null,
        budget: 0,
        useWallet,
        drop: { block: addr.block, house: addr.house, street: addr.street || null, landmark: addr.landmark || null },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      haptic([10, 40, 10]);
      if (res.data.payUrl) window.location.href = res.data.payUrl;
      else router.replace(`/orders/${res.data.orderId}?new=1`);
    });
  }

  return (
    <div className="min-h-dvh pb-40">
      <header className="safe-top sticky top-0 z-30 bg-bg/85 px-5 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-2">
          <motion.button whileTap={{ scale: 0.88 }} onClick={() => router.back()} aria-label="Back" className="-ml-2 grid size-10 place-items-center rounded-full hover:bg-sunken">
            <ChevronLeft className="size-6" strokeWidth={2.2} />
          </motion.button>
          <h1 className="flex-1 truncate font-display text-[19px] font-semibold">Send a rider</h1>
        </div>
      </header>

      <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }} className="space-y-5 px-5 pt-2">
        <motion.section variants={rise}>
          <RouteCard shop={shop} address={addr} />
        </motion.section>

        <motion.section variants={rise} className="space-y-4 rounded-[24px] bg-surface p-4 shadow-[var(--shadow-card)] ring-1 ring-line/60">
          <Field label="Name the order is under" hint="The rider asks the shop for your order by this name.">
            <Input value={collectAs} onChange={(e) => setCollectAs(e.target.value)} maxLength={60} autoComplete="name" />
          </Field>
          <Field label="What's in it?" optional>
            <Input value={what} onChange={(e) => setWhat(e.target.value)} maxLength={300} placeholder="e.g. 1 sealed bag of medicine" />
          </Field>
        </motion.section>

        <motion.section variants={rise}>
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              haptic(8);
              setConfirmed((v) => !v);
            }}
            aria-pressed={confirmed}
            className={cn(
              "flex w-full items-start gap-3.5 rounded-[24px] p-4 text-left ring-1 transition-colors",
              confirmed ? "bg-primary-soft ring-primary/30" : "bg-surface ring-line/70 shadow-[var(--shadow-card)]",
            )}
          >
            <motion.span
              animate={{ scale: confirmed ? [1, 1.18, 1] : 1 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
              className={cn(
                "mt-0.5 grid size-7 shrink-0 place-items-center rounded-[10px] border-2 transition-colors",
                confirmed ? "border-primary bg-primary text-primary-ink" : "border-line-strong bg-surface",
              )}
            >
              <AnimatePresence>
                {confirmed ? (
                  <motion.span key="c" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}>
                    <Check className="size-4" strokeWidth={3.2} />
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </motion.span>
            <span>
              <span className={cn("block text-[15px] font-semibold", confirmed ? "text-primary-soft-ink" : "text-ink")}>
                I&apos;ve paid {shop.name} and it&apos;s packed
              </span>
              <span className={cn("mt-0.5 block text-[13px] leading-relaxed", confirmed ? "text-primary-soft-ink/85" : "text-muted")}>
                Book once the shop says it&apos;s ready, so your rider isn&apos;t kept waiting.
              </span>
            </span>
          </motion.button>
          {shop.contacts.length ? (
            <button
              type="button"
              onClick={() => setContactOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-[13.5px] font-semibold text-primary hover:bg-primary-soft"
            >
              <Phone className="size-3.5" /> Haven&apos;t ordered yet? Call {shop.name}
            </button>
          ) : null}
        </motion.section>

        <motion.section variants={rise}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-ink">Deliver to</h3>
            {!editAddr ? (
              <button onClick={() => setEditAddr(true)} className="text-[13.5px] font-semibold text-primary">
                Change
              </button>
            ) : null}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            {editAddr ? (
              <motion.div key="edit" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3 rounded-[22px] bg-surface p-4 ring-1 ring-line/70">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Block">
                    <Input value={addr.block} onChange={(e) => setAddr({ ...addr, block: e.target.value })} placeholder="e.g. C" />
                  </Field>
                  <Field label="House / Flat">
                    <Input value={addr.house} onChange={(e) => setAddr({ ...addr, house: e.target.value })} placeholder="e.g. 14" />
                  </Field>
                </div>
                <Field label="Landmark" optional>
                  <Input value={addr.landmark} onChange={(e) => setAddr({ ...addr, landmark: e.target.value })} placeholder="e.g. Blue gate by the playground" />
                </Field>
                <Button variant="secondary" size="sm" onClick={() => addr.block && addr.house && setEditAddr(false)} disabled={!addr.block || !addr.house}>
                  <Check className="size-4" /> Done
                </Button>
              </motion.div>
            ) : (
              <motion.div key="view" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-3 rounded-[22px] bg-surface p-4 ring-1 ring-line/70">
                <span className="grid size-11 place-items-center rounded-2xl bg-hero text-hero-ink">
                  <Home className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-ink">
                    Block {addr.block}, House {addr.house}
                  </p>
                  <p className="truncate text-[13px] text-muted">{[addr.street, addr.landmark].filter(Boolean).join(" · ") || "No directions added"}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        <motion.section variants={rise} className="rounded-[24px] bg-surface p-4 shadow-[var(--shadow-card)] ring-1 ring-line/60">
          <div className="flex items-baseline justify-between gap-3 py-1.5">
            <div>
              <p className="text-[14.5px] text-ink-2">Delivery fee</p>
              {quote.loyaltyFree ? (
                <p className="text-[12.5px] text-primary">Your {props.loyaltyEvery}th errand is on us 🎉</p>
              ) : quote.loyaltyRemaining > 0 ? (
                <p className="text-[12.5px] text-muted">{quote.loyaltyRemaining} more until a free one</p>
              ) : null}
            </div>
            <span className="tnum text-[15px] font-medium text-ink">
              {quote.loyaltyFree ? (
                <span className="flex items-center gap-2">
                  <span className="text-faint line-through">{naira(quote.serviceFee)}</span>
                  <span className="font-semibold text-primary">Free</span>
                </span>
              ) : (
                naira(quote.serviceFee)
              )}
            </span>
          </div>
          {props.walletBalance > 0 && quote.total > 0 ? (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-3.5 py-3">
              <div className="flex items-center gap-2.5">
                <Wallet className="size-[18px] text-primary" />
                <div>
                  <p className="text-[14px] font-medium text-ink">Use wallet</p>
                  <p className="tnum text-[12.5px] text-muted">Balance {naira(props.walletBalance)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <AnimatePresence>
                  {useWallet ? (
                    <motion.span initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="tnum text-[14px] font-semibold text-primary">
                      −{naira(quote.walletApplied)}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
                <Switch checked={useWallet} onChange={setUseWallet} label="Use wallet balance" />
              </div>
            </div>
          ) : null}
          <div className="mt-3 flex items-end justify-between border-t border-dashed border-line-strong pt-4">
            <span className="text-[15px] font-semibold text-ink">You pay now</span>
            <motion.span key={quote.toPay} initial={{ scale: 0.9, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} className="tnum font-display text-[28px] font-bold leading-none text-ink">
              {naira(quote.toPay)}
            </motion.span>
          </div>
        </motion.section>

        <motion.div variants={rise} className="flex gap-3 px-1 text-[12.5px] leading-relaxed text-muted">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            Your items are paid to {shop.name} directly. {APP_NAME} only charges for delivery, paid here in the app — never give the rider cash. Cancel before the
            rider reaches the shop and the fee goes back to your wallet.
          </p>
        </motion.div>
      </motion.div>

      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px]">
        <div className="safe-bottom border-t border-line/70 bg-bg/90 px-5 pt-3 backdrop-blur-xl">
          <Button size="xl" block onClick={submit} loading={pending} disabled={!!error}>
            {error ?? (
              <>
                <Bike className="size-5" /> {quote.toPay === 0 ? "Send a rider" : `Pay ${naira(quote.toPay)} · Send a rider`}
              </>
            )}
          </Button>
        </div>
      </div>

      <ShopContactSheet shop={shop} open={contactOpen} onClose={() => setContactOpen(false)} showMenuLink={false} />
    </div>
  );
}

/** Shop → your door, with a rider riding the route. */
function RouteCard({ shop, address }: { shop: Shop; address: Address }) {
  const t = tintFor(shop.category);
  return (
    <div className="overflow-hidden rounded-[24px] shadow-[var(--shadow-card)] ring-1 ring-line/60" style={{ background: t.bg }}>
      <div className="flex items-center gap-3 px-4 pb-2 pt-4">
        <CategoryArt id={shop.category} size={48} />
        <div className="relative h-10 flex-1">
          <span aria-hidden className="absolute inset-x-0 top-1/2 h-0 -translate-y-1/2 border-t-[2.5px] border-dashed border-ink/20" />
          <motion.span
            aria-hidden
            className="absolute top-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary text-primary-ink shadow-[var(--shadow-button)]"
            initial={{ left: "8%" }}
            animate={{ left: ["8%", "92%"] }}
            transition={{ duration: 2.8, ease: [0.45, 0, 0.25, 1], repeat: Infinity, repeatType: "reverse", repeatDelay: 0.5 }}
          >
            <Bike className="size-[18px]" />
          </motion.span>
        </div>
        <span className="grid size-12 place-items-center rounded-2xl bg-hero text-hero-ink">
          <Home className="size-6" />
        </span>
      </div>
      <div className="flex items-start justify-between gap-4 px-4 pb-4">
        <div className="min-w-0">
          <p className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-2/70">Collect from</p>
          <p className="truncate font-display text-[16px] font-semibold text-ink">{shop.name}</p>
          {shop.location ? <p className="truncate text-[12.5px] text-ink-2">{shop.location}</p> : null}
        </div>
        <div className="min-w-0 text-right">
          <p className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-2/70">To</p>
          <p className="truncate font-display text-[16px] font-semibold text-ink">{address.block && address.house ? `Block ${address.block}, ${address.house}` : "Your door"}</p>
        </div>
      </div>
    </div>
  );
}
