"use client";

import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { haptic } from "@/lib/haptics";

/** Quantity stepper. At 1, the minus becomes a remove button if onRemove is given. */
export function QtyStepper({ value, onChange, onRemove, max = 99 }: { value: number; onChange: (v: number) => void; onRemove?: () => void; max?: number }) {
  return (
    <div className="flex h-9 items-center rounded-xl bg-sunken p-0.5">
      <motion.button
        type="button"
        whileTap={{ scale: 0.85 }}
        onClick={() => {
          haptic(5);
          if (value <= 1) onRemove?.();
          else onChange(value - 1);
        }}
        aria-label={value <= 1 && onRemove ? "Remove" : "Decrease"}
        className="grid size-8 place-items-center rounded-[10px] text-ink-2 hover:bg-surface"
      >
        {value <= 1 && onRemove ? <Trash2 className="size-4" /> : <Minus className="size-4" />}
      </motion.button>
      <span className="relative w-7 overflow-hidden text-center">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            className="tnum block font-display text-[15px] font-semibold text-ink"
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </span>
      <motion.button
        type="button"
        whileTap={{ scale: 0.85 }}
        onClick={() => {
          haptic(5);
          onChange(Math.min(max, value + 1));
        }}
        aria-label="Increase"
        className="grid size-8 place-items-center rounded-[10px] text-ink-2 hover:bg-surface"
      >
        <Plus className="size-4" />
      </motion.button>
    </div>
  );
}
