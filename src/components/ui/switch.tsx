"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  size = "md",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  size?: "md" | "lg";
}) {
  const lg = size === "lg";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        haptic(10);
        onChange(!checked);
      }}
      className={cn(
        "relative flex shrink-0 items-center rounded-full p-[3px] transition-colors duration-300",
        lg ? "h-9 w-[62px]" : "h-7 w-12",
        checked ? "justify-end bg-primary" : "justify-start bg-line-strong",
        disabled && "opacity-50",
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 700, damping: 34 }}
        className={cn("block rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.18)]", lg ? "size-[30px]" : "size-[22px]")}
      />
    </button>
  );
}
