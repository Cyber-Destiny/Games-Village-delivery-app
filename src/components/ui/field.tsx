"use client";

import { AnimatePresence, motion } from "motion/react";
import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

export function Field({
  label,
  hint,
  error,
  children,
  className,
  htmlFor,
  optional,
}: {
  label?: string;
  hint?: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
  optional?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <label htmlFor={htmlFor} className="flex items-baseline justify-between px-0.5 text-[13.5px] font-medium text-ink-2">
          <span>{label}</span>
          {optional ? <span className="text-[12px] font-normal text-faint">Optional</span> : null}
        </label>
      ) : null}
      {children}
      <AnimatePresence initial={false} mode="wait">
        {error ? (
          <motion.p
            key="err"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="px-0.5 text-[12.5px] font-medium text-danger"
          >
            {error}
          </motion.p>
        ) : hint ? (
          <motion.p key="hint" initial={false} className="px-0.5 text-[12.5px] text-muted">
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

const inputBase =
  "w-full rounded-2xl border border-line bg-surface px-4 text-[16px] text-ink shadow-[inset_0_1px_2px_rgb(var(--shadow-color)/0.04)] outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-faint focus:border-primary focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_14%,transparent)] disabled:opacity-60";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { leading?: React.ReactNode; trailing?: React.ReactNode; invalid?: boolean }
>(function Input({ className, leading, trailing, invalid, ...rest }, ref) {
  const id = useId();
  if (!leading && !trailing) {
    return (
      <input
        ref={ref}
        id={rest.id ?? id}
        className={cn(inputBase, "h-[52px]", invalid && "border-danger", className)}
        {...rest}
      />
    );
  }
  return (
    <div className="relative">
      {leading ? (
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted">{leading}</span>
      ) : null}
      <input
        ref={ref}
        id={rest.id ?? id}
        className={cn(inputBase, "h-[52px]", leading && "pl-11", trailing && "pr-12", invalid && "border-danger", className)}
        {...rest}
      />
      {trailing ? <span className="absolute inset-y-0 right-3 flex items-center">{trailing}</span> : null}
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cn(inputBase, "min-h-[96px] resize-none py-3.5 leading-relaxed", className)} {...rest} />;
  },
);

export function Select({
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <div className="relative">
      <select className={cn(inputBase, "h-[52px] appearance-none pr-10", className)} {...rest}>
        {children}
      </select>
      <svg
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
