"use client";

import { ArrowRight, Bike, Clock3, MapPin, MessageCircle } from "lucide-react";
import Link from "next/link";
import { Photo, shopPhoto } from "@/components/brand/photo";
import { LinkButton } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/cn";
import type { Shop } from "@/lib/resident";

/**
 * Shown when a resident taps a shop: chat with the shop to order, then send a
 * rider once it's paid for and packed.
 */
export function ShopContactSheet({
  shop,
  open,
  onClose,
  showMenuLink = true,
  runnerBuys,
}: {
  shop: Shop | null;
  open: boolean;
  onClose: () => void;
  showMenuLink?: boolean;
  runnerBuys: boolean;
}) {
  return (
    <Sheet open={open && !!shop} onClose={onClose}>
      {shop ? <Body shop={shop} showMenuLink={showMenuLink && runnerBuys} runnerBuys={runnerBuys} /> : null}
    </Sheet>
  );
}

function Body({ shop, showMenuLink, runnerBuys }: { shop: Shop; showMenuLink: boolean; runnerBuys: boolean }) {
  return (
    <div className="overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-1 sm:px-6 sm:pt-6">
      <div className="relative aspect-[16/7] overflow-hidden rounded-[20px] bg-sunken">
        <Photo src={shopPhoto(shop)} alt={shop.name} sizes="(min-width: 640px) 460px, 100vw" />
      </div>
      <h2 className="mt-4 font-display text-[22px] font-bold leading-tight text-ink">{shop.name}</h2>
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

      <p className="mt-4 text-[14px] leading-relaxed text-ink-2">
        {shop.chat
          ? `Chat with ${shop.name} to order and agree how to pay. When it's packed, send a rider to bring it to you.`
          : runnerBuys
            ? `${shop.name} isn't taking chats yet, but a runner can buy it for you.`
            : `${shop.name} isn't taking chats yet. If you've already paid them, send a rider to collect your order.`}
      </p>

      <div className="mt-5 space-y-2">
        <ShopChatButton shop={shop} />
        <LinkButton href={`/collect?vendor=${shop.id}`} size="lg" block variant={shop.chat ? "secondary" : "primary"}>
          <Bike className="size-[18px]" /> Paid the shop? Send a rider
        </LinkButton>
        {showMenuLink ? (
          <Link
            href={`/shops/${shop.id}`}
            className="flex h-12 items-center justify-center gap-1.5 rounded-2xl text-[14.5px] font-semibold text-ink-2 transition-colors hover:bg-sunken"
          >
            Or let a runner buy it for you <ArrowRight className="size-4" />
          </Link>
        ) : null}
      </div>
      <p className="mt-3 text-center text-[12px] leading-relaxed text-faint">
        {APP_NAME} handles the delivery. What you order and pay the shop is between you and {shop.name}.
      </p>
    </div>
  );
}

/** "Chat with <shop>": opens the in-app chat. Hidden for shops that aren't on chat yet. */
export function ShopChatButton({ shop, className }: { shop: Pick<Shop, "id" | "name" | "chat">; className?: string }) {
  if (!shop.chat) return null;
  return (
    <LinkButton href={`/chat/${shop.id}`} size="lg" block className={cn(className)}>
      <MessageCircle className="size-[18px]" /> Chat with {shop.name}
    </LinkButton>
  );
}
