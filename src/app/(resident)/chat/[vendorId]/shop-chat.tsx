"use client";

import { Bike, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CallButton } from "@/components/call/call-provider";
import { ChatView } from "@/components/chat/chat-view";
import { OffPlatformNote } from "@/components/legal/notes";
import { Photo, shopPhoto } from "@/components/brand/photo";
import { LinkButton } from "@/components/ui/button";
import { APP_NAME } from "@/lib/brand";
import type { residentChat } from "@/lib/shop-chat";

type Data = Awaited<ReturnType<typeof residentChat>>;

const QUICK = ["Hi, what do you have today?", "How much will it be?", "Please pack it, I'll send a rider", "I've paid, please confirm"];

export function ShopChat({ vendorId, initial }: { vendorId: string; initial: Data }) {
  const router = useRouter();
  const shop = initial.shop;
  return (
    <ChatView
      side="resident"
      endpoint={`/api/shop-chat/${vendorId}`}
      initial={initial}
      quickReplies={initial.messages.length < 6 ? QUICK : []}
      placeholder={`Message ${shop.name}`}
      header={() => (
        <div className="flex h-16 items-center gap-3 px-3">
          <button onClick={() => (history.length > 1 ? router.back() : router.push("/home"))} aria-label="Back" className="grid size-10 place-items-center rounded-full hover:bg-sunken">
            <ChevronLeft className="size-6" strokeWidth={2.2} />
          </button>
          <Link href={`/shops/${shop.id}`} className="flex min-w-0 flex-1 items-center gap-3">
            <span className="relative block size-10 shrink-0 overflow-hidden rounded-full bg-sunken">
              <Photo src={shopPhoto(shop)} sizes="80px" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15.5px] font-semibold text-ink">{shop.name}</span>
              <span className="block truncate text-[12px] text-muted">{shop.hours ? `Open ${shop.hours}` : shop.location ?? "Shop"}</span>
            </span>
          </Link>
          {initial.online ? (
            <CallButton target={{ vendorId: shop.id }} peer={{ name: shop.name, subtitle: "Shop", image: shop.image, category: shop.category }} />
          ) : null}
          <LinkButton href={`/collect?vendor=${shop.id}`} size="sm" variant="soft" className="shrink-0 rounded-full">
            <Bike className="size-4" /> Rider
          </LinkButton>
        </div>
      )}
      intro={(d) =>
        d.messages.length === 0 ? (
          <div className="mx-auto mt-6 max-w-[320px] text-center">
            <span className="relative mx-auto block size-20 overflow-hidden rounded-[22px] bg-sunken">
              <Photo src={shopPhoto(shop)} sizes="160px" />
            </span>
            <p className="mt-4 font-display text-[19px] font-semibold text-ink">Chat with {shop.name}</p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
              Tell them what you want. They&apos;ll confirm the price and how to pay. When it&apos;s packed, send a rider to bring it to you.
            </p>
            <p className="mt-3 text-[12px] text-faint">Phone numbers are hidden so your order stays safe on {APP_NAME}.</p>
            <OffPlatformNote className="mt-4 text-left">
              Book riders only through {APP_NAME}. Deliveries or meet-ups arranged outside the app aren&apos;t covered, and we aren&apos;t responsible for what happens.
            </OffPlatformNote>
          </div>
        ) : null
      }
      closed={(d) =>
        d.online ? null : (
          <>
            {shop.name} isn&apos;t taking chats yet.{" "}
            <Link href={`/shops/${shop.id}`} className="font-semibold text-primary">
              Let a runner buy it
            </Link>
          </>
        )
      }
    />
  );
}
