"use client";

import { motion } from "motion/react";
import { Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";

export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-2" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= value;
        return (
          <motion.button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            whileTap={{ scale: 0.8 }}
            animate={on ? { scale: [1, 1.28, 1], rotate: [0, -8, 0] } : { scale: 1 }}
            transition={{ duration: 0.36, delay: on ? (n - 1) * 0.04 : 0 }}
            onClick={() => {
              haptic(8);
              onChange(n);
            }}
            className="p-1"
          >
            <Star
              className={cn("size-10 transition-colors duration-200", on ? "fill-accent text-accent" : "fill-transparent text-line-strong")}
              strokeWidth={1.6}
            />
          </motion.button>
        );
      })}
    </div>
  );
}

export function StarRating({ value, className }: { value: number | null; className?: string }) {
  if (value === null) return <span className={cn("text-[12.5px] text-muted", className)}>New</span>;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-2", className)}>
      <Star className="size-3.5 fill-accent text-accent" />
      {value.toFixed(1)}
    </span>
  );
}
