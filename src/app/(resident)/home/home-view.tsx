"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ChevronDown, ChevronRight, Clock3, Megaphone, Phone, RotateCcw, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ShopContactSheet } from "@/components/app/shop-contact-sheet";
import { CategoryThumb, categoryPhoto, Photo, shopPhoto } from "@/components/brand/photo";
import { Avatar } from "@/components/ui/avatar";
import { ESTATE_NAME } from "@/lib/brand";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { cn } from "@/lib/cn";
import type { OrderCardData } from "@/lib/orders/queries";
import { milestoneIndex, statusCopy, STATUS_LABEL } from "@/lib/orders/status";
import type { Shop } from "@/lib/resident";

const ease = [0.22, 1, 0.36, 1] as const;

const EXAMPLES = [
  "2 loaves of bread and a tin of milk",
  "Refill my 12.5kg gas cylinder",
  "Collect my parcel at the main gate",
  "Jollof rice and chicken, 2 plates",
  "Drop my clothes at the dry cleaner",
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};
const rise = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
};

function SectionTitle({ children, href, action }: { children: React.ReactNode; href?: string; action?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between px-5">
      <h2 className="font-display text-[20px] font-semibold tracking-[-0.01em] text-ink">{children}</h2>
      {href ? (
        <Link href={href} className="flex items-center gap-0.5 text-[13.5px] font-medium text-primary">
          {action ?? "See all"} <ChevronRight className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}

function LiveOrderCard({ o }: { o: OrderCardData }) {
  const copy = statusCopy({ status: o.status, kind: o.kind, category: o.category, runnerName: o.runnerFirstName, place: o.place });
  const step = milestoneIndex(o.status);
  return (
    <Link href={`/orders/${o.id}`} className="block w-full shrink-0 snap-center">
      <motion.div whileTap={{ scale: 0.98 }} className="overflow-hidden rounded-[22px] bg-hero text-hero-ink shadow-[var(--shadow-raised)]">
        <div className="flex gap-4 p-4">
          <CategoryThumb id={o.category} size={56} radius={14} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent">
                <span className="relative flex size-1.5">
                  <span className="absolute inset-0 animate-[var(--animate-pulse-ring)] rounded-full bg-accent" />
                  <span className="relative size-1.5 rounded-full bg-accent" />
                </span>
                {STATUS_LABEL[o.status]}
              </span>
              <span className="tnum text-[12px] text-hero-muted">#{o.code}</span>
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={copy.title}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mt-1 truncate font-display text-[18px] font-semibold leading-tight"
              >
                {copy.title}
              </motion.p>
            </AnimatePresence>
            <p className="mt-0.5 truncate text-[13px] text-hero-muted">{o.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-white/10 px-4 py-3">
          <div className="flex flex-1 gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/15">
                <motion.span
                  className="block h-full rounded-full bg-accent"
                  initial={{ width: 0 }}
                  animate={{ width: i < step ? "100%" : i === step ? "55%" : 0 }}
                  transition={{ duration: 0.8, ease, delay: 0.1 + i * 0.06 }}
                />
              </span>
            ))}
          </div>
          <span className="flex shrink-0 items-center gap-1 text-[13px] font-semibold">
            {o.status === "awaiting_payment" ? "Pay now" : "Track"} <ArrowRight className="size-4" />
          </span>
        </div>
      </motion.div>
    </Link>
  );
}

function AskBox() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % EXAMPLES.length), 2800);
    return () => clearInterval(t);
  }, []);
  return (
    <Link href="/new" className="block px-5">
      <motion.div whileTap={{ scale: 0.985 }} className="flex h-14 items-center gap-3 rounded-2xl border border-line bg-surface px-4 shadow-[var(--shadow-card)]">
        <Search className="size-5 shrink-0 text-muted" />
        <div className="relative h-5 min-w-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={i}
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -14, opacity: 0 }}
              transition={{ duration: 0.35, ease }}
              className="absolute inset-0 truncate text-[15px] text-muted"
            >
              {EXAMPLES[i]}
            </motion.p>
          </AnimatePresence>
        </div>
      </motion.div>
    </Link>
  );
}

function ShopCard({ s, onOpen }: { s: Shop; onOpen: () => void }) {
  const meta = [s.location, s.hours].filter(Boolean).join(" · ");
  return (
    <motion.button type="button" whileTap={{ scale: 0.985 }} onClick={onOpen} className="block w-full text-left">
      <div className="relative aspect-[16/8] overflow-hidden rounded-[20px] bg-sunken">
        <Photo src={shopPhoto(s)} alt={s.name} sizes="(min-width: 480px) 440px, 100vw" />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[17px] font-semibold text-ink">{s.name}</p>
          <p className="truncate text-[13px] text-muted">{meta || getCategory(s.category).label}</p>
        </div>
        {s.contacts.length ? (
          <span className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-primary-soft px-3.5 text-[13.5px] font-semibold text-primary-soft-ink">
            <Phone className="size-4" /> Call
          </span>
        ) : null}
      </div>
    </motion.button>
  );
}

export function HomeView({
  name,
  address,
  greeting,
  data,
}: {
  name: string;
  address: string;
  greeting: string;
  data: {
    open: boolean;
    openTime: string;
    closeTime: string;
    announcement: string;
    loyaltyEvery: number;
    loyaltyProgress: number;
    shops: Shop[];
    activeOrders: OrderCardData[];
    reorder: OrderCardData[];
  };
}) {
  const first = name.split(" ")[0];
  const remaining = data.loyaltyEvery - data.loyaltyProgress - 1;
  // Keep the last shop around while the sheet animates out.
  const [contactShop, setContactShop] = useState<Shop | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const openShop = (s: Shop) => {
    setContactShop(s);
    setContactOpen(true);
  };

  return (
    <motion.main variants={stagger} initial="hidden" animate="show" className="pb-36">
      <motion.header variants={rise} className="safe-top flex items-center justify-between gap-4 px-5 pt-3">
        <Link href="/account" className="min-w-0">
          <p className="text-[12px] font-medium text-muted">Deliver to</p>
          <p className="flex items-center gap-1 truncate text-[15px] font-semibold text-ink">
            <span className="truncate">{address}</span>
            <ChevronDown className="size-4 shrink-0 text-muted" />
          </p>
        </Link>
        <Link href="/account" aria-label="Account">
          <Avatar name={name} size={40} />
        </Link>
      </motion.header>

      <motion.h1 variants={rise} className="mt-5 px-5 font-display text-[28px] font-bold leading-tight tracking-[-0.02em] text-ink">
        {greeting}, {first}
      </motion.h1>

      {!data.open ? (
        <motion.p variants={rise} className="mt-1.5 flex items-center gap-1.5 px-5 text-[13.5px] text-muted">
          <Clock3 className="size-4" /> Closed now. Errands run {data.openTime}–{data.closeTime}.
        </motion.p>
      ) : null}

      {data.announcement ? (
        <motion.div variants={rise} className="mx-5 mt-4 flex items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-[13.5px] text-ink-2">
          <Megaphone className="mt-0.5 size-4 shrink-0 text-accent-soft-ink" />
          <p className="leading-snug">{data.announcement}</p>
        </motion.div>
      ) : null}

      <motion.div variants={rise} className="mt-5">
        <AskBox />
      </motion.div>

      {data.activeOrders.length ? (
        <motion.section variants={rise} className="mt-7">
          <SectionTitle>{data.activeOrders.length > 1 ? "Live errands" : "Live errand"}</SectionTitle>
          <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1">
            {data.activeOrders.map((o) => (
              <div key={o.id} className={cn("shrink-0", data.activeOrders.length > 1 ? "w-[88%]" : "w-full")}>
                <LiveOrderCard o={o} />
              </div>
            ))}
          </div>
        </motion.section>
      ) : null}

      <motion.section variants={rise} className="mt-8">
        <SectionTitle>What do you need?</SectionTitle>
        <div className="grid grid-cols-3 gap-x-3 gap-y-4 px-5">
          {CATEGORIES.map((c) => (
            <Link key={c.id} href={`/new?category=${c.id}`} className="group">
              <motion.div whileTap={{ scale: 0.96 }} className="relative aspect-square overflow-hidden rounded-[18px] bg-sunken">
                <Photo src={categoryPhoto(c.id)} alt="" sizes="(min-width: 480px) 150px, 33vw" className="transition-transform duration-500 group-hover:scale-105" />
              </motion.div>
              <p className="mt-1.5 text-center text-[13px] font-semibold leading-tight text-ink">{c.short === "Pickup" ? "Pick up" : c.label}</p>
            </Link>
          ))}
        </div>
      </motion.section>

      {data.shops.length ? (
        <motion.section variants={rise} className="mt-9">
          <SectionTitle>Shops in {ESTATE_NAME}</SectionTitle>
          <p className="-mt-2 mb-4 px-5 text-[13.5px] text-muted">Call or WhatsApp to order, then send a rider to collect it.</p>
          <div className="space-y-6 px-5">
            {data.shops.map((s) => (
              <ShopCard key={s.id} s={s} onOpen={() => openShop(s)} />
            ))}
          </div>
        </motion.section>
      ) : null}

      {data.loyaltyEvery > 0 ? (
        <motion.section variants={rise} className="mx-5 mt-9">
          <div className="rounded-[20px] border border-line bg-surface p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[15px] font-semibold text-ink">{remaining <= 0 ? "Your next errand fee is free" : `${remaining} more until a free errand`}</p>
              <p className="tnum shrink-0 text-[13px] text-muted">
                {data.loyaltyProgress}/{data.loyaltyEvery}
              </p>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sunken">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${(data.loyaltyProgress / data.loyaltyEvery) * 100}%` }}
                transition={{ duration: 0.9, ease, delay: 0.3 }}
              />
            </div>
            <p className="mt-2 text-[12.5px] text-muted">Every {data.loyaltyEvery}th service fee is on us.</p>
          </div>
        </motion.section>
      ) : null}

      {data.reorder.length ? (
        <motion.section variants={rise} className="mt-9">
          <SectionTitle href="/orders" action="History">
            Order again
          </SectionTitle>
          <div className="mx-5 divide-y divide-line overflow-hidden rounded-[20px] border border-line bg-surface">
            {data.reorder.map((o) => (
              <div key={o.id} className="flex items-center gap-3 px-4 py-3">
                <CategoryThumb id={o.category} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-semibold text-ink">{o.title}</p>
                  <p className="truncate text-[12.5px] text-muted">{o.place || getCategory(o.category).label}</p>
                </div>
                <Link
                  href={`/new?from=${o.id}`}
                  className="flex h-9 items-center gap-1.5 rounded-full bg-sunken px-3.5 text-[13px] font-semibold text-ink transition-colors hover:bg-line"
                >
                  <RotateCcw className="size-3.5" /> Again
                </Link>
              </div>
            ))}
          </div>
        </motion.section>
      ) : null}

      <ShopContactSheet shop={contactShop} open={contactOpen} onClose={() => setContactOpen(false)} />
    </motion.main>
  );
}
