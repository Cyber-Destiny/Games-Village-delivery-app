"use client";

import Link from "next/link";
import { motion, type HTMLMotionProps } from "motion/react";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import { Spinner } from "./spinner";

type Variant = "primary" | "secondary" | "ghost" | "accent" | "danger" | "dark" | "soft" | "outline";
type Size = "sm" | "md" | "lg" | "xl" | "icon";

const base =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background-color,color,box-shadow,opacity] duration-200 disabled:opacity-50 disabled:saturate-50 [&_svg]:shrink-0";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-ink shadow-[var(--shadow-button)] hover:bg-primary-hover",
  secondary: "bg-surface text-ink border border-line shadow-[var(--shadow-card)] hover:bg-surface-2",
  outline: "border border-line-strong text-ink hover:bg-sunken/60",
  ghost: "text-ink-2 hover:bg-sunken/70 hover:text-ink",
  soft: "bg-primary-soft text-primary-soft-ink hover:brightness-[0.98]",
  accent:
    "bg-accent text-accent-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_8px_18px_-8px_rgb(200_130_0/0.6)] hover:brightness-[1.03]",
  danger: "bg-danger-soft text-danger-soft-ink hover:brightness-[0.98]",
  dark: "bg-ink text-bg hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "h-9 rounded-xl px-3.5 text-[13.5px]",
  md: "h-11 rounded-2xl px-5 text-[15px]",
  lg: "h-[52px] rounded-2xl px-6 text-[16px]",
  xl: "h-14 rounded-[20px] px-7 text-[17px]",
  icon: "size-10 rounded-full",
};

export type ButtonProps = Omit<HTMLMotionProps<"button">, "children"> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
  children?: React.ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, block, className, children, disabled, onClick, ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileTap={disabled || loading ? undefined : { scale: 0.965 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      className={cn(base, variants[variant], sizes[size], block && "w-full", className)}
      disabled={disabled || loading}
      onClick={(e) => {
        haptic(6);
        onClick?.(e);
      }}
      {...rest}
    >
      <span className={cn("items-center gap-2", block ? "flex w-full justify-center" : "inline-flex", loading && "opacity-0")}>{children}</span>
      {loading ? (
        <span className="absolute inset-0 grid place-items-center">
          <Spinner className="size-5" />
        </span>
      ) : null}
    </motion.button>
  );
});

const MotionLink = motion.create(Link);

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  block,
  className,
  children,
  prefetch,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  block?: boolean;
  className?: string;
  children: React.ReactNode;
  prefetch?: boolean;
}) {
  return (
    <MotionLink
      href={href}
      prefetch={prefetch}
      whileTap={{ scale: 0.965 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      className={cn(base, variants[variant], sizes[size], block && "w-full", className)}
      onClick={() => haptic(6)}
    >
      {children}
    </MotionLink>
  );
}

export function IconButton({
  className,
  label,
  children,
  ...rest
}: Omit<HTMLMotionProps<"button">, "children"> & { label: string; children: React.ReactNode }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-10 place-items-center rounded-full text-ink-2 transition-colors hover:bg-sunken/80 hover:text-ink",
        className,
      )}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
