"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Bike, ChevronLeft, Clock3, MapPin, PencilLine, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ShopChatButton } from "@/components/app/shop-contact-sheet";
import { Photo, shopPhoto } from "@/components/brand/photo";
import { Button, LinkButton } from "@/components/ui/button";
import { QtyStepper } from "@/components/ui/stepper";
import { haptic } from "@/lib/haptics";
import { naira } from "@/lib/money";
import type { Shop } from "@/lib/resident";

export function ShopView({ shop }: { shop: Shop }) {
  const router = useRouter();
  const [cart, setCart] = useState<Record<string, number>>({});
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
      <div className="relative h-60 bg-sunken">
        <Photo src={shopPhoto(shop)} alt={shop.name} sizes="480px" preload />
        <div aria-hidden className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent" />
        <Link
          href="/home"
          aria-label="Back"
          className="absolute left-4 top-[max(env(safe-area-inset-top),12px)] grid size-10 place-items-center rounded-full bg-surface/95 text-ink shadow-[var(--shadow-card)] backdrop-blur"
        >
          <ChevronLeft className="size-5" strokeWidth={2.4} />
        </Link>
      </div>

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="px-5 pt-5">
        <h1 className="font-display text-[28px] font-bold leading-tight tracking-[-0.02em] text-ink">{shop.name}</h1>
        {shop.description ? <p className="mt-1 text-[14.5px] text-ink-2">{shop.description}</p> : null}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
          {shop.location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" /> {shop.location}
            </span>
          ) : null}
          {shop.hours ? (
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-3.5" /> {shop.hours}
            </span>
          ) : null}
        </div>

        {shop.chat ? (
          <>
            <h2 className="mt-7 text-[15px] font-semibold text-ink">Order directly</h2>
            <p className="mt-0.5 text-[13px] text-muted">Chat with {shop.name} to order and agree how to pay. When it&apos;s packed, send a rider.</p>
            <ShopChatButton shop={shop} className="mt-3" />
          </>
        ) : null}
        <LinkButton href={`/collect?vendor=${shop.id}`} size="lg" block variant={shop.chat ? "secondary" : "primary"} className={shop.chat ? "mt-2" : "mt-7"}>
          <Bike className="size-[18px]" /> Paid &amp; packed? Send a rider
        </LinkButton>
      </motion.section>

      <section className="mt-10 px-5">
        <h2 className="text-[15px] font-semibold text-ink">Or let a runner buy it</h2>
        <p className="mt-0.5 text-[13px] text-muted">Pick items and we pay the shop for you. Prices may vary slightly.</p>
        {shop.items.length ? (
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[18px] border border-line bg-surface">
            {shop.items.map((it) => {
              const q = cart[it.id] ?? 0;
              return (
                <li key={it.id} className="flex items-center gap-3 px-4 py-3.5">
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
                        className="grid size-9 place-items-center rounded-full border border-line text-ink"
                      >
                        <Plus className="size-[18px]" strokeWidth={2.2} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        ) : null}

        <Link href={`/new?vendor=${shop.id}`} className="mt-3 flex items-center gap-3 rounded-[18px] border border-line bg-surface px-4 py-3.5">
          <PencilLine className="size-5 shrink-0 text-muted" />
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
    </div>
  );
}
