"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/cn";

/** Naira amount input. Value/onChange are in kobo. */
export const MoneyInput = forwardRef<
  HTMLInputElement,
  {
    value: number;
    onChange: (kobo: number) => void;
    placeholder?: string;
    size?: "md" | "lg";
    className?: string;
    autoFocus?: boolean;
    id?: string;
    invalid?: boolean;
  }
>(function MoneyInput({ value, onChange, placeholder = "0", size = "md", className, autoFocus, id, invalid }, ref) {
  const naira = Math.round(value / 100);
  const display = naira ? naira.toLocaleString("en-NG") : "";
  return (
    <div
      className={cn(
        "group flex items-center rounded-2xl border border-line bg-surface px-4 transition-[border-color,box-shadow] focus-within:border-primary focus-within:shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_14%,transparent)]",
        size === "lg" ? "h-16" : "h-[52px]",
        invalid && "border-danger",
        className,
      )}
    >
      <span className={cn("mr-1.5 font-display font-semibold text-muted", size === "lg" ? "text-2xl" : "text-lg")}>₦</span>
      <input
        ref={ref}
        id={id}
        inputMode="numeric"
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={display}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 9);
          onChange((Number(digits) || 0) * 100);
        }}
        className={cn(
          "tnum w-full bg-transparent font-display font-semibold text-ink outline-none placeholder:text-faint",
          size === "lg" ? "text-[28px]" : "text-[18px]",
        )}
      />
    </div>
  );
});
