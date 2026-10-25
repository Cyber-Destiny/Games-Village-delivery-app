"use client";

import { ChevronLeft, MessageCircle, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/brand/logo";
import { ChatView } from "@/components/chat/chat-view";
import { APP_NAME } from "@/lib/brand";
import { telLink, whatsappLink } from "@/lib/contact";
import { formatPhoneLocal } from "@/lib/phone";
import type { supportChat } from "@/lib/support";

type Data = Awaited<ReturnType<typeof supportChat>>;

const QUICK = {
  resident: ["I have a problem with an errand", "Question about a payment or refund", "Help with my wallet", "Please add a shop"],
  runner: ["Problem on a job", "Question about my earnings", "Update my bank details", "I can't go online"],
  shop: ["Problem with an order", "A rider didn't come", "Update our shop details", "Add or remove staff"],
};

export function SupportChat({
  initial,
  home,
  audience,
  phone,
  hours,
  draft,
}: {
  initial: Data;
  home: string;
  audience: keyof typeof QUICK;
  phone: string;
  hours: string;
  draft: string;
}) {
  const router = useRouter();
  return (
    <ChatView
      side="user"
      endpoint="/api/support"
      initial={initial}
      draft={draft}
      quickReplies={(d) => (d.messages.length === 0 && !draft ? QUICK[audience] : [])}
      placeholder="Message support"
      header={() => (
        <div className="flex h-16 items-center gap-3 px-3">
          <button onClick={() => (history.length > 1 ? router.back() : router.push(home))} aria-label="Back" className="grid size-10 place-items-center rounded-full hover:bg-sunken">
            <ChevronLeft className="size-6" strokeWidth={2.2} />
          </button>
          <LogoMark size={40} className="shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15.5px] font-semibold text-ink">{APP_NAME} support</span>
            <span className="block truncate text-[12px] text-muted">Replies {hours}</span>
          </span>
          {phone ? (
            <>
              <a href={telLink(phone)} aria-label="Call support" className="grid size-10 place-items-center rounded-full bg-primary-soft text-primary-soft-ink">
                <Phone className="size-[18px]" />
              </a>
              <a
                href={whatsappLink(phone, `Hi ${APP_NAME}, `)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp support"
                className="grid size-10 place-items-center rounded-full bg-[#25D366]/15 text-[#128C4B] dark:text-[#5BE38F]"
              >
                <MessageCircle className="size-[18px]" />
              </a>
            </>
          ) : null}
        </div>
      )}
      intro={(d) =>
        d.messages.length === 0 ? (
          <div className="mx-auto mt-6 max-w-[320px] text-center">
            <LogoMark size={72} className="mx-auto" />
            <p className="mt-4 font-display text-[20px] font-semibold text-ink">How can we help?</p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
              Chat with the {APP_NAME} team here. We&apos;re online {hours} and usually reply within a few minutes.
            </p>
            {phone ? (
              <p className="mt-3 text-[13px] leading-relaxed text-muted">
                Prefer to talk? Call or WhatsApp{" "}
                <a href={telLink(phone)} className="tnum font-semibold text-ink">
                  {formatPhoneLocal(phone)}
                </a>
                .
              </p>
            ) : null}
          </div>
        ) : null
      }
    />
  );
}
