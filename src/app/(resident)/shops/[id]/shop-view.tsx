"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Bike, Clock3, MapPin, PencilLine, Phone, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CategoryArt, tintFor } from "@/components/brand/category-art";
import { PageHeader } from "@/components/app/page-header";
import { ShopContactSheet } from "@/components/app/shop-contact-sheet";
import { Button, LinkButton } from "@/components/ui/button";
import { QtyStepper } from "@/components/ui/stepper";
import { getCategory } from "@/lib/categories";
import { haptic } from "@/lib/haptics";
import { naira } from "@/lib/money";
import type { Shop } from "@/lib/resident";

export function ShopView({ shop }: { shop: Shop }) {
  const router = useRouter();
  const t = tintFor(shop.category);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [contactOpen, setContactOpen] = useState(false);
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const subtotal = useMemo(() => shop.items.reduce((a, i) => a + (cart[i.id] ?? 0) * i.price, 0), [cart, shop.items]);

  const setQty = (id: string, q: number) =>
    setCart((c) => {
      const next = { ...c };
      if (q <= 0) delete next[id];
      else next[id] = q;
      return next;
    });

  const go = () => {
    const add = Object.entries(cart)
      .map(([id, q]) => `${id}:${q}`)
      .join(",");
    router.push(`/new?vendor=${shop.id}${add ? `&add=${add}` : ""}`);
  };

  return (
    <div className="pb-40">
      <div className="relative overflow-hidden pb-8" style={{ background: t.bg }}>
        <div className="px-5">
          <PageHeader back="/home" className="!bg-transparent !shadow-none !backdrop-blur-none" />
        </div>
        <motion.div initial="rest" animate="hover" className="flex flex-col items-center px-5 pt-2 text-center">
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
            <CategoryArt id={shop.category} size={96} />
          </motion.div>
          <h1 className="mt-4 font-display text-[28px] font-bold leading-tight text-ink">{shop.name}</h1>
          <p className="mt-1 text-[14px] text-ink-2">{shop.description || getCategory(shop.category).blurb}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-[12.5px] font-medium text-ink-2">
            {shop.location ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface/70 px-3 py-1.5">
                <MapPin className="size-3.5" /> {shop.location}
              </span>
            ) : null}
            {shop.hours ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface/70 px-3 py-1.5">
                <Clock3 className="size-3.5" /> {shop.hours}
              </span>
            ) : null}
            {shop.isPartner ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface/70 px-3 py-1.5 text-primary-soft-ink">
                <Sparkles className="size-3.5" /> Partner shop
              </span>
            ) : null}
          </div>
          <div className="mt-5 flex w-full max-w-sm gap-2">
            <Button variant="secondary" size="lg" className="flex-1 px-4" onClick={() => setContactOpen(true)}>
              <Phone className="size-[18px]" /> Call to order
            </Button>
            <LinkButton href={`/collect?vendor=${shop.id}`} size="lg" className="flex-1 px-4">
              <Bike className="size-[18px]" /> Send a rider
            </LinkButton>
          </div>
        </motion.div>
      </div>

      <section className="-mt-4 rounded-t-[28px] bg-bg px-5 pt-6">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-[19px] font-semibold text-ink">Or let a runner buy it</h2>
            <p className="text-[12.5px] text-muted">Pick items and we pay the shop for you</p>
          </div>
          <span className="shrink-0 text-[12px] text-faint">Prices may vary</span>
        </div>
        {shop.items.length ? (
          <motion.ul
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.04 } } }}
            className="divide-y divide-line overflow-hidden rounded-[22px] border border-line/70 bg-surface shadow-[var(--shadow-card)]"
          >
            {shop.items.map((it) => {
              const q = cart[it.id] ?? 0;
              return (
                <motion.li key={it.id} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium text-ink">{it.name}</p>
                    <p className="tnum text-[13.5px] text-muted">{naira(it.price)}</p>
                  </div>
                  <AnimatePresence mode="popLayout" initial={false}>
                    {q ? (
                      <motion.div key="q" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                        <QtyStepper value={q} onChange={(v) => setQty(it.id, v)} onRemove={() => setQty(it.id, 0)} />
                      </motion.div>
                    ) : (
                      <motion.button
                        key="a"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        whileTap={{ scale: 0.88 }}
                        onClick={() => {
                          haptic(6);
                          setQty(it.id, 1);
                        }}
                        aria-label={`Add ${it.name}`}
                        className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary-soft-ink"
                      >
                        <Plus className="size-[18px]" strokeWidth={2.4} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </motion.ul>
        ) : null}

        <Link
          href={`/new?vendor=${shop.id}`}
          className="mt-4 flex items-center gap-3 rounded-[22px] border border-dashed border-line-strong bg-surface-2 px-4 py-4"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-surface shadow-[var(--shadow-card)]">
            <PencilLine className="size-5 text-ink-2" />
          </span>
          <span className="flex-1">
            <span className="block text-[14.5px] font-semibold text-ink">Need something not listed?</span>
            <span className="block text-[12.5px] text-muted">Describe it and your runner will get it</span>
          </span>
          <ArrowRight className="size-4 text-faint" />
        </Link>
      </section>

      <AnimatePresence>
        {count > 0 ? (
          <motion.div
            initial={{ y: 120 }}
            animate={{ y: 0 }}
            exit={{ y: 120 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px]"
          >
            <div className="safe-bottom px-4 pt-3">
              <Button size="xl" block onClick={go} className="px-4">
                <span className="flex flex-1 items-center justify-between">
                  <span className="grid size-8 place-items-center rounded-full bg-white/20 text-[14px] font-bold">{count}</span>
                  <span>Continue</span>
                  <span className="tnum flex items-center gap-1">
                    {naira(subtotal)} <ArrowRight className="size-4" />
                  </span>
                </span>
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ShopContactSheet shop={shop} open={contactOpen} onClose={() => setContactOpen(false)} showMenuLink={false} />
    </div>
  );
}
