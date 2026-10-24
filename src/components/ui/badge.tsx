import { cn } from "@/lib/cn";
import { STATUS_LABEL, statusTone, type OrderStatus, type StatusTone } from "@/lib/orders/status";

const tones: Record<StatusTone, string> = {
  neutral: "bg-sunken text-ink-2",
  brand: "bg-primary-soft text-primary-soft-ink",
  accent: "bg-accent-soft text-accent-soft-ink",
  success: "bg-primary-soft text-primary-soft-ink",
  danger: "bg-danger-soft text-danger-soft-ink",
};

const dots: Record<StatusTone, string> = {
  neutral: "bg-muted",
  brand: "bg-primary",
  accent: "bg-accent",
  success: "bg-primary",
  danger: "bg-danger",
};

export function Badge({
  tone = "neutral",
  children,
  className,
  dot,
  pulse,
}: {
  tone?: StatusTone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
  pulse?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-semibold tracking-[0.01em]",
        tones[tone],
        className,
      )}
    >
      {dot ? (
        <span className="relative flex size-1.5">
          {pulse ? <span className={cn("absolute inset-0 rounded-full animate-[var(--animate-pulse-ring)]", dots[tone])} /> : null}
          <span className={cn("relative size-1.5 rounded-full", dots[tone])} />
        </span>
      ) : null}
      {children}
    </span>
  );
}

export function StatusBadge({ status, className, label }: { status: OrderStatus; className?: string; label?: string }) {
  const tone = statusTone(status);
  const live = !["delivered", "cancelled", "awaiting_payment"].includes(status);
  return (
    <Badge tone={tone} dot pulse={live} className={className}>
      {label ?? STATUS_LABEL[status]}
    </Badge>
  );
}
