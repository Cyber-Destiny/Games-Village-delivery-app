import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/cn";

/**
 * Brand mark: a rounded tile with a forward-leaning "r" whose arm becomes a
 * motion arrow — an errand in progress.
 */
export function LogoMark({ size = 36, className, tone = "brand" }: { size?: number; className?: string; tone?: "brand" | "light" }) {
  const bg = tone === "brand" ? "var(--primary)" : "#ffffff";
  const fg = tone === "brand" ? "var(--primary-ink)" : "var(--hero)";
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="12" fill={bg} />
      <path
        d="M13.5 29V17.2c0-2.4 1.9-4.2 4.3-4.2h3.4"
        fill="none"
        stroke={fg}
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M21.6 9.3 27.4 13l-5.8 3.7" fill="none" stroke={fg} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="27.6" cy="27.6" r="3.2" fill="var(--accent)" />
    </svg>
  );
}

export function Logo({ className, tone = "brand", size = 34 }: { className?: string; tone?: "brand" | "light"; size?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} tone={tone} />
      <span
        className={cn("font-display text-[22px] font-bold leading-none tracking-[-0.04em]", tone === "light" ? "text-hero-ink" : "text-ink")}
      >
        {APP_NAME.toLowerCase()}
      </span>
    </span>
  );
}
