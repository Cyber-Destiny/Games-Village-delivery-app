import { MessageCircle, MessagesSquare, Phone } from "lucide-react";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { telLink, whatsappLink } from "@/lib/contact";
import { formatPhoneLocal } from "@/lib/phone";

const pill =
  "flex h-11 items-center justify-center gap-2 rounded-2xl border border-line bg-surface text-[14px] font-semibold text-ink transition-colors hover:bg-surface-2";

/** "Need help?" card: chat with support in the app, or call / WhatsApp the support line. */
export function SupportCard({ phone, unread = 0, className, title = "Need help?" }: { phone: string; unread?: number; className?: string; title?: string }) {
  return (
    <section className={cn("rounded-[22px] border border-line/70 bg-surface p-4 shadow-[var(--shadow-card)]", className)}>
      <div className="flex items-center gap-3.5">
        <LogoMark size={44} className="shrink-0" />
        <div className="min-w-0">
          <p className="text-[15.5px] font-semibold text-ink">{title}</p>
          <p className="text-[13px] leading-snug text-muted">
            Chat with the {APP_NAME} team{phone ? <>, or call or WhatsApp <span className="tnum whitespace-nowrap font-medium text-ink-2">{formatPhoneLocal(phone)}</span></> : null}.
          </p>
        </div>
      </div>
      <Link
        href="/support"
        className="mt-4 flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-semibold text-primary-ink shadow-[var(--shadow-button)] transition-colors hover:bg-primary-hover"
      >
        <MessagesSquare className="size-[18px]" /> Chat with support
        {unread ? <span className="tnum grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-ink">{unread}</span> : null}
      </Link>
      {phone ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <a href={telLink(phone)} className={pill}>
            <Phone className="size-4" /> Call
          </a>
          <a href={whatsappLink(phone, `Hi ${APP_NAME}, `)} target="_blank" rel="noopener noreferrer" className={pill}>
            <MessageCircle className="size-4 text-[#128C4B] dark:text-[#5BE38F]" /> WhatsApp
          </a>
        </div>
      ) : null}
    </section>
  );
}
