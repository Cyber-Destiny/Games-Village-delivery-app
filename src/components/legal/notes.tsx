import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { OFF_PLATFORM_NOTICE } from "@/lib/legal";

/** The "dealings outside the app aren't covered" disclaimer. */
export function OffPlatformNote({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <p className={cn("flex gap-2.5 text-[12.5px] leading-relaxed text-muted", className)}>
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-accent-soft-ink" />
      <span>
        {children ?? OFF_PLATFORM_NOTICE}{" "}
        <Link href="/terms#off-platform" className="font-medium text-ink-2 underline underline-offset-2">
          Learn more
        </Link>
      </span>
    </p>
  );
}

export function LegalLinks({ className }: { className?: string }) {
  return (
    <p className={cn("text-center text-[12.5px] text-muted", className)}>
      <Link href="/terms" className="hover:text-ink">
        Terms of Service
      </Link>
      <span className="mx-2 text-faint">·</span>
      <Link href="/privacy" className="hover:text-ink">
        Privacy Policy
      </Link>
    </p>
  );
}
