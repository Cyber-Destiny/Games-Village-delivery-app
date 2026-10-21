"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ChevronRight, Clock3, MapPin, Megaphone, Phone, RotateCcw, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ShopContactSheet } from "@/components/app/shop-contact-sheet";
import { CategoryArt, CategoryBadge, tintFor } from "@/components/brand/category-art";
import { Avatar } from "@/components/ui/avatar";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { naira } from "@/lib/money";
import type { OrderCardData } from "@/lib/orders/queries";
import { milestoneIndex, statusCopy, STATUS_LABEL } from "@/lib/orders/status";
import type { Shop } from "@/lib/resident";

const ease = [0.22, 1, 0.36, 1] as const;

const EXAMPLES = [
  "2 loaves of bread and Peak milk",
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
      <h2 className="font-display text-[19px] font-semibold text-ink">{children}</h2>
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
      <motion.div
        whileTap={{ scale: 0.98 }}
        className="grain relative overflow-hidden rounded-[26px] bg-hero p-5 text-hero-ink shadow-[var(--shadow-raised)]"
      >
        <div
          aria-hidden
          className="absolute -right-16 -top-20 size-56 rounded-full opacity-60 blur-2xl"
          style={{ background: "radial-gradient(circle, color-mix(in oklab, var(--accent) 50%, transparent), transparent 65%)" }}
        />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1.5 pr-3 text-[12px] font-semibold">
              <span className="relative flex size-2">
                <span className="absolute inset-0 animate-[var(--animate-pulse-ring)] rounded-full bg-accent" />
                <span className="relative size-2 rounded-full bg-accent" />
              </span>
              {STATUS_LABEL[o.status]}
            </span>
            <span className="tnum text-[12.5px] font-medium text-hero-muted">#{o.code}</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={copy.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-4 font-display text-[22px] font-semibold leading-tight"
            >
              {copy.title}
            </motion.p>
          </AnimatePresence>
          <p className="mt-1 truncate text-[13.5px] text-hero-muted">{o.title}</p>
          <div className="mt-5 flex gap-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
                <motion.span
                  className="block h-full rounded-full bg-accent"
                  initial={{ width: 0 }}
                  animate={{ width: i < step ? "100%" : i === step ? "55%" : 0 }}
                  transition={{ duration: 0.8, ease, delay: 0.1 + i * 0.06 }}
                />
              </span>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-[13.5px] font-semibold">
            <span>{o.status === "awaiting_payment" ? "Complete payment" : "Track errand"}</span>
            <span className="grid size-8 place-items-center rounded-full bg-white text-hero">
              <ArrowRight className="size-4" />
            </span>
          </div>
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
      <motion.div
        whileTap={{ scale: 0.985 }}
        className="flex items-center gap-3 rounded-[22px] border border-line bg-surface px-4 py-4 shadow-[var(--shadow-card)]"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary-soft">
          <Search className="size-5 text-primary-soft-ink" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15.5px] font-semibold text-ink">What do you need?</p>
          <div className="relative h-5 overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={i}
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -14, opacity: 0 }}
                transition={{ duration: 0.35, ease }}
                className="absolute inset-0 truncate text-[13.5px] text-muted"
              >
                e.g. {EXAMPLES[i]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
        <ArrowRight className="size-5 text-faint" />
      </motion.div>
    </Link>
  );
}

function ShopCard({ s, onOpen }: { s: Shop; onOpen: () => void }) {
  const t = tintFor(s.category);
  const top = s.items.slice(0, 2);
  return (
    <button type="button" onClick={onOpen} className="block w-[236px] shrink-0 snap-start text-left">
      <motion.div whileTap={{ scale: 0.97 }} initial="rest" whileHover="hover" animate="rest" className="card flex h-full flex-col overflow-hidden">
        <div className="relative flex h-[92px] items-end justify-between px-4 pb-3" style={{ background: t.bg }}>
          <CategoryArt id={s.category} size={58} />
          {s.isPartner ? (
            <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-surface/85 px-2 py-1 text-[11px] font-semibold text-primary-soft-ink backdrop-blur">
              <Sparkles className="size-3" /> Partner
            </span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col p-4">
          <p className="truncate font-display text-[16.5px] font-semibold text-ink">{s.name}</p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[12.5px] text-muted">
            <MapPin className="size-3.5 shrink-0" />
            {s.location || getCategory(s.category).label}
          </p>
          {top.length ? (
            <div className="mt-3 space-y-1.5">
              {top.map((it) => (
                <div key={it.id} className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="truncate text-ink-2">{it.name}</span>
                  <span className="tnum shrink-0 font-medium text-ink">{naira(it.price)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-[13px] text-muted">{s.description || "Tell us what you need"}</p>
          )}
          <span className="mt-auto flex items-center gap-1.5 pt-3.5 text-[13px] font-semibold text-primary">
            <Phone className="size-3.5" /> {s.contacts.length ? "Call or WhatsApp to order" : "Order through a runner"}
          </span>
        </div>
      </motion.div>
    </button>
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
      {/* header */}
      <motion.header variants={rise} className="safe-top px-5 pt-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[14px] text-muted">{greeting},</p>
            <h1 className="font-display text-[30px] font-bold leading-tight text-ink">{first}</h1>
          </div>
          <Link href="/account" aria-label="Account" className="mt-1">
            <Avatar name={name} size={44} />
          </Link>
        </div>
        <Link
          href="/account"
          className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-ink-2 shadow-[var(--shadow-card)]"
        >
          <MapPin className="size-3.5 shrink-0 text-primary" />
          <span className="truncate">{address}</span>
          <ChevronRight className="size-3.5 shrink-0 text-faint" />
        </Link>
      </motion.header>

      {data.announcement ? (
        <motion.div variants={rise} className="mx-5 mt-4 flex items-start gap-3 rounded-2xl bg-accent-soft px-4 py-3 text-[13.5px] text-accent-soft-ink">
          <Megaphone className="mt-0.5 size-4 shrink-0" />
          <p className="leading-snug">{data.announcement}</p>
        </motion.div>
      ) : null}

      {!data.open ? (
        <motion.div variants={rise} className="mx-5 mt-4 flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5">
          <span className="grid size-10 place-items-center rounded-xl bg-sunken">
            <Clock3 className="size-5 text-ink-2" />
          </span>
          <div className="text-[13.5px] leading-snug">
            <p className="font-semibold text-ink">We&apos;re closed right now</p>
            <p className="text-muted">
              Errands run daily, {data.openTime}–{data.closeTime}. You can still browse.
            </p>
          </div>
        </motion.div>
      ) : null}

      {/* live errands */}
      {data.activeOrders.length ? (
        <motion.section variants={rise} className="mt-6">
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

      <motion.div variants={rise} className="mt-6">
        <AskBox />
      </motion.div>

      {/* categories */}
      <motion.section variants={rise} className="mt-8">
        <SectionTitle>Get something</SectionTitle>
        <div className="grid grid-cols-3 gap-2.5 px-5">
          {CATEGORIES.map((c) => {
            const t = tintFor(c.id);
            return (
              <Link key={c.id} href={`/new?category=${c.id}`}>
                <motion.div
                  initial="rest"
                  animate="rest"
                  whileHover="hover"
                  whileTap="hover"
                  className="flex aspect-[1/1.02] flex-col items-center justify-center gap-2 rounded-[22px] px-2 text-center"
                  style={{ background: t.bg }}
                >
                  <motion.span variants={{ rest: { scale: 1 }, hover: { scale: 1.06 } }}>
                    <CategoryArt id={c.id} size={50} />
                  </motion.span>
                  <span className="text-[13px] font-semibold leading-tight text-ink">{c.short === "Pickup" ? "Pick up" : c.label}</span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </motion.section>

      {/* shops */}
      {data.shops.length ? (
        <motion.section variants={rise} className="mt-8">
          <SectionTitle>Shops in the estate</SectionTitle>
          <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto scroll-px-5 px-5 pb-2">
            {data.shops.map((s) => (
              <ShopCard key={s.id} s={s} onOpen={() => openShop(s)} />
            ))}
          </div>
        </motion.section>
      ) : null}

      {/* loyalty */}
      {data.loyaltyEvery > 0 ? (
        <motion.section variants={rise} className="mx-5 mt-8">
          <div className="card overflow-hidden p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-[17px] font-semibold text-ink">
                  {remaining <= 0 ? "Your next errand fee is free 🎉" : `${remaining} more until a free errand`}
                </p>
                <p className="mt-0.5 text-[13px] text-muted">Every {data.loyaltyEvery}th service fee is on us.</p>
              </div>
            </div>
            <div className="mt-4 flex gap-1.5">
              {Array.from({ length: data.loyaltyEvery }).map((_, i) => {
                const filled = i < data.loyaltyProgress;
                const last = i === data.loyaltyEvery - 1;
                return (
                  <motion.span
                    key={i}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 + i * 0.04, type: "spring", stiffness: 500, damping: 22 }}
                    className={cn(
                      "grid aspect-square flex-1 place-items-center rounded-full text-[10px] font-bold",
                      last ? "bg-accent-soft text-accent-soft-ink ring-1 ring-accent/50" : filled ? "bg-primary text-primary-ink" : "bg-sunken",
                    )}
                  >
                    {last ? "★" : filled ? "✓" : ""}
                  </motion.span>
                );
              })}
            </div>
          </div>
        </motion.section>
      ) : null}

      {/* reorder */}
      {data.reorder.length ? (
        <motion.section variants={rise} className="mt-8">
          <SectionTitle href="/orders" action="History">
            Order again
          </SectionTitle>
          <div className="mx-5 divide-y divide-line overflow-hidden rounded-[22px] border border-line/70 bg-surface shadow-[var(--shadow-card)]">
            {data.reorder.map((o) => (
              <div key={o.id} className="flex items-center gap-3 px-4 py-3.5">
                <CategoryBadge id={o.category} size={42} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-semibold text-ink">{o.title}</p>
                  <p className="truncate text-[12.5px] text-muted">{o.place || getCategory(o.category).label}</p>
                </div>
                <Link
                  href={`/new?from=${o.id}`}
                  className="flex h-9 items-center gap-1.5 rounded-xl bg-sunken px-3 text-[13px] font-semibold text-ink transition-colors hover:bg-line"
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
