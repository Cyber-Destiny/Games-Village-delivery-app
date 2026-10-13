"use client";

import { AnimatePresence, motion } from "motion/react";
import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";

type Tone = "success" | "error" | "info";
type Toast = { id: number; tone: Tone; title: string; description?: string };

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function push(tone: Tone, title: string, description?: string, duration = 3800) {
  const id = nextId++;
  toasts = [...toasts.slice(-2), { id, tone, title, description }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, duration);
}

export const toast = Object.assign((title: string, description?: string) => push("info", title, description), {
  success: (title: string, description?: string) => push("success", title, description),
  error: (title: string, description?: string) => push("error", title, description, 5200),
  info: (title: string, description?: string) => push("info", title, description),
});

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const empty: Toast[] = [];

export function Toaster() {
  const items = useSyncExternalStore(
    subscribe,
    () => toasts,
    () => empty,
  );
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 px-4 pt-[max(env(safe-area-inset-top),12px)]"
    >
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96, transition: { duration: 0.18 } }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl px-4 py-3 shadow-[var(--shadow-pop)] backdrop-blur-xl",
              "border border-white/10 bg-[color-mix(in_oklab,var(--ink)_92%,transparent)] text-[var(--bg)]",
            )}
          >
            <span className="mt-0.5 shrink-0">
              {t.tone === "success" ? (
                <CircleCheck className="size-[18px] text-[#5fd99a]" strokeWidth={2.25} />
              ) : t.tone === "error" ? (
                <CircleAlert className="size-[18px] text-[#ff8a75]" strokeWidth={2.25} />
              ) : (
                <Info className="size-[18px] text-[var(--accent)]" strokeWidth={2.25} />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-medium leading-snug">{t.title}</p>
              {t.description ? <p className="mt-0.5 text-[13px] leading-snug opacity-70">{t.description}</p> : null}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
