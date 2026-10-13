"use client";

import { motion } from "motion/react";
import { useId } from "react";
import { cn } from "@/lib/cn";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; count?: number }[];
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("inline-flex rounded-2xl bg-sunken p-1", className)} role="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl px-3.5 text-[13.5px] font-medium transition-colors",
              active ? "text-ink" : "text-muted hover:text-ink-2",
            )}
          >
            {active ? (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-xl bg-surface shadow-[0_1px_2px_rgb(var(--shadow-color)/0.08),0_4px_12px_-6px_rgb(var(--shadow-color)/0.2)]"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            ) : null}
            <span className="relative">{o.label}</span>
            {o.count ? (
              <span
                className={cn(
                  "relative grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold",
                  active ? "bg-primary text-primary-ink" : "bg-line-strong/70 text-ink-2",
                )}
              >
                {o.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
