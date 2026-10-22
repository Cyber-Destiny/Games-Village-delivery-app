"use client";

import { motion } from "motion/react";
import { ArrowRight, Bike, Clock3, MapPin, MessageCircle, Phone, PhoneOff } from "lucide-react";
import Link from "next/link";
import { Photo, shopPhoto } from "@/components/brand/photo";
import { LinkButton } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import { displayContactPhone, telHref, whatsappHref } from "@/lib/phone";
import type { Shop } from "@/lib/resident";

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
  const meta = [shop.location, shop.hours].filter(Boolean);

  return (
    <div className="overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-1 sm:px-6 sm:pt-6">
      <div className="relative aspect-[16/7] overflow-hidden rounded-[20px] bg-sunken">
        <Photo src={shopPhoto(shop)} alt={shop.name} sizes="(min-width: 640px) 460px, 100vw" />
      </div>
      <h2 className="mt-4 font-display text-[22px] font-bold leading-tight text-ink">{shop.name}</h2>
      {meta.length ? (
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-muted">
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
      ) : null}

      <p className="mt-4 text-[14px] leading-relaxed text-ink-2">
        Call or WhatsApp to order, and pay {shop.name} directly. When it&apos;s packed, send a rider to bring it to you.
      </p>

      <ShopContacts shop={shop} className="mt-4" />

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

/** The shop's numbers, each with Call and (for mobiles) WhatsApp. */
export function ShopContacts({ shop, className }: { shop: Pick<Shop, "name" | "contacts">; className?: string }) {
  const greeting = `Hello ${shop.name}, I found you on ${APP_NAME}. I'd like to order:`;
  if (!shop.contacts.length) {
    return (
      <div className={cn("flex items-center gap-3 rounded-[18px] bg-surface-2 px-4 py-4 text-[14px] text-ink-2", className)}>
        <PhoneOff className="size-5 shrink-0 text-faint" />
        <p>We don&apos;t have a number for {shop.name} yet. A runner can buy it for you instead.</p>
      </div>
    );
  }
  return (
    <ul className={cn("divide-y divide-line overflow-hidden rounded-[18px] border border-line bg-surface", className)}>
      {shop.contacts.map((c) => {
        const wa = whatsappHref(c.phone, greeting);
        const shown = displayContactPhone(c.phone);
        return (
          <li key={c.phone} className="flex items-center gap-3 py-3 pl-4 pr-3">
            <div className="min-w-0 flex-1">
              <p className="tnum text-[17px] font-semibold tracking-wide text-ink">{shown}</p>
              <p className="truncate text-[12.5px] text-muted">{c.label || "Shop line"}</p>
            </div>
            {wa ? (
              <motion.a
                whileTap={{ scale: 0.9 }}
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => haptic(6)}
                aria-label={`WhatsApp ${shop.name} on ${shown}`}
                className="grid size-11 place-items-center rounded-full bg-[#25d366]/14 text-[#128c4a] dark:text-[#4ade80]"
              >
                <MessageCircle className="size-5" />
              </motion.a>
            ) : null}
            <motion.a
              whileTap={{ scale: 0.9 }}
              href={telHref(c.phone)}
              onClick={() => haptic(6)}
              aria-label={`Call ${shop.name} on ${shown}`}
              className="grid size-11 place-items-center rounded-full bg-primary text-primary-ink"
            >
              <Phone className="size-5" />
            </motion.a>
          </li>
        );
      })}
    </ul>
  );
}
