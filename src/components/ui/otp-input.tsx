"use client";

import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/** One hidden input drives N animated boxes — works with SMS autofill and paste. */
export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  invalid,
  disabled,
  autoFocus = true,
}: {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  return (
    <motion.div
      className="relative"
      animate={invalid ? { x: [0, -10, 9, -6, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.45 }}
      onClick={() => ref.current?.focus()}
    >
      <input
        ref={ref}
        value={value}
        disabled={disabled}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="Verification code"
        maxLength={length}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(0, length);
          onChange(v);
          if (v.length === length) onComplete?.(v);
        }}
        className="absolute inset-0 z-10 size-full cursor-text opacity-0"
      />
      <div className="flex justify-between gap-2">
        {Array.from({ length }).map((_, i) => {
          const char = value[i];
          const active = !disabled && (i === value.length || (i === length - 1 && value.length === length));
          return (
            <div
              key={i}
              className={cn(
                "relative grid h-[60px] flex-1 place-items-center rounded-2xl border bg-surface font-display text-[26px] font-semibold text-ink transition-[border-color,box-shadow] duration-200",
                invalid
                  ? "border-danger"
                  : active
                    ? "border-primary shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_14%,transparent)]"
                    : char
                      ? "border-line-strong"
                      : "border-line",
              )}
            >
              {char ? (
                <motion.span key={char + i} initial={{ y: 8, opacity: 0, scale: 0.7 }} animate={{ y: 0, opacity: 1, scale: 1 }}>
                  {char}
                </motion.span>
              ) : active ? (
                <span className="h-7 w-[2px] animate-pulse rounded-full bg-primary" />
              ) : null}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
