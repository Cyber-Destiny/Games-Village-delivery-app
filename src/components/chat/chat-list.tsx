import Link from "next/link";
import { Photo, shopPhoto } from "@/components/brand/photo";
import { cn } from "@/lib/cn";
import type { ResidentThread } from "@/lib/shop-chat";
import { timeAgo } from "@/lib/time";

/** A resident's conversations with shops, newest first. */
export function ChatList({ threads, className }: { threads: ResidentThread[]; className?: string }) {
  return (
    <ul className={cn("divide-y divide-line overflow-hidden rounded-[20px] border border-line bg-surface", className)}>
      {threads.map((t) => (
        <li key={t.vendorId}>
          <Link href={`/chat/${t.vendorId}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2">
            <span className="relative block size-12 shrink-0 overflow-hidden rounded-full bg-sunken">
              <Photo src={shopPhoto(t)} sizes="96px" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className={cn("truncate text-[15px] text-ink", t.unread ? "font-bold" : "font-semibold")}>{t.name}</span>
                <span className="shrink-0 text-[11.5px] text-faint">{timeAgo(t.at)}</span>
              </span>
              <span className="flex items-center justify-between gap-2">
                <span className={cn("truncate text-[13.5px]", t.unread ? "font-medium text-ink-2" : "text-muted")}>{t.preview}</span>
                {t.unread ? (
                  <span className="tnum grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-ink">{t.unread}</span>
                ) : null}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
