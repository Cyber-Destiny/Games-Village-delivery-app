"use client";

import { motion } from "motion/react";
import { ArrowRight, Bike, Clock3, MapPin, MessageCircle, Phone, PhoneOff } from "lucide-react";
import Link from "next/link";
import { CategoryArt, tintFor } from "@/components/brand/category-art";
import { LinkButton } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { APP_NAME } from "@/lib/brand";
import { haptic } from "@/lib/haptics";
import { displayContactPhone, telHref, whatsappHref } from "@/lib/phone";
import type { Shop } from "@/lib/resident";

const STEPS = ["Call or WhatsApp to order", "Pay the shop directly", "Send a rider to collect"];

/**
 * Shown when a resident taps a shop: the shop's numbers so they can order directly,
 * then a one-tap way to send a rider once it's paid for and packed.
 */
export function ShopContactSheet({
  shop,
  open,
  onClose,
  showMenuLink = true,
}: {
  shop: Shop | null;
  open: boolean;
  onClose: () => void;
  showMenuLink?: boolean;
}) {
  return (
    <Sheet open={open && !!shop} onClose={onClose}>
      {shop ? <Body shop={shop} showMenuLink={showMenuLink} /> : null}
    </Sheet>
  );
}

function Body({ shop, showMenuLink }: { shop: Shop; showMenuLink: boolean }) {
  const t = tintFor(shop.category);
  const greeting = `Hello ${shop.name}, I found you on ${APP_NAME}. I'd like to order:`;

  return (
    <div className="overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-2 sm:px-6 sm:pt-6">
      <div className="flex items-center gap-4 rounded-[22px] p-4" style={{ background: t.bg }}>
        <motion.div initial={{ scale: 0.7, rotate: -8, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 18 }}>
          <CategoryArt id={shop.category} size={60} />
        </motion.div>
        <div className="min-w-0">
          <h2 className="font-display text-[21px] font-bold leading-tight text-ink">{shop.name}</h2>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12.5px] text-ink-2">
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
        </div>
      </div>

      <ol className="mt-5 grid grid-cols-3 gap-2">
        {STEPS.map((s, i) => (
          <motion.li
            key={s}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + i * 0.07 }}
            className="relative flex flex-col items-center text-center"
          >
            {i < STEPS.length - 1 ? <span aria-hidden className="absolute left-[calc(50%+18px)] top-[13px] h-0.5 w-[calc(100%-36px)] rounded-full bg-line" /> : null}
            <span className="tnum grid size-7 place-items-center rounded-full bg-primary-soft text-[13px] font-bold text-primary-soft-ink">{i + 1}</span>
            <span className="mt-1.5 text-[12px] font-medium leading-snug text-ink-2">{s}</span>
          </motion.li>
        ))}
      </ol>

      <div className="mt-5">
        {shop.contacts.length ? (
          <ul className="space-y-2.5">
            {shop.contacts.map((c, i) => {
              const wa = whatsappHref(c.phone, greeting);
              return (
                <motion.li
                  key={c.phone}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.06, type: "spring", stiffness: 380, damping: 30 }}
                  className="flex items-center gap-3 rounded-[20px] border border-line/80 bg-surface-2/60 py-3 pl-4 pr-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-muted">{c.label || "Shop line"}</p>
                    <p className="tnum font-display text-[18px] font-semibold tracking-wide text-ink">{displayContactPhone(c.phone)}</p>
                  </div>
                  {wa ? (
                    <motion.a
                      whileTap={{ scale: 0.9 }}
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => haptic(6)}
                      aria-label={`WhatsApp ${shop.name} on ${displayContactPhone(c.phone)}`}
                      className="grid size-11 place-items-center rounded-2xl bg-[#25d366]/15 text-[#128c4a] dark:text-[#4ade80]"
                    >
                      <MessageCircle className="size-5" />
                    </motion.a>
                  ) : null}
                  <motion.a
                    whileTap={{ scale: 0.9 }}
                    href={telHref(c.phone)}
                    onClick={() => haptic(6)}
                    aria-label={`Call ${shop.name} on ${displayContactPhone(c.phone)}`}
                    className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-ink shadow-[var(--shadow-button)]"
                  >
                    <Phone className="size-5" />
                  </motion.a>
                </motion.li>
              );
            })}
          </ul>
        ) : (
          <div className="flex items-center gap-3 rounded-[20px] bg-surface-2 px-4 py-4 text-[14px] text-ink-2">
            <PhoneOff className="size-5 shrink-0 text-faint" />
            <p>We don&apos;t have a number for {shop.name} yet. A runner can buy it for you instead.</p>
          </div>
        )}
      </div>

      <div className="mt-6">
        <LinkButton href={`/collect?vendor=${shop.id}`} size="xl" block>
          <Bike className="size-5" /> Paid &amp; packed? Send a rider
        </LinkButton>
        {showMenuLink ? (
          <Link
            href={`/shops/${shop.id}`}
            className="mt-2 flex h-12 items-center justify-center gap-1.5 rounded-2xl text-[14.5px] font-semibold text-ink-2 transition-colors hover:bg-sunken"
          >
            Or let a runner buy it for you <ArrowRight className="size-4" />
          </Link>
        ) : null}
        <p className="mt-3 text-center text-[12px] leading-relaxed text-faint">
          {APP_NAME} handles the delivery. What you order and pay the shop is between you and {shop.name}.
        </p>
      </div>
    </div>
  );
}
