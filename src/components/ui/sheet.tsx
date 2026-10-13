"use client";

import { AnimatePresence, motion, useDragControls } from "motion/react";
import { X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

/**
 * Bottom sheet on phones, centred dialog on larger screens.
 * Drag the handle down (or tap outside / press Esc) to close.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  className,
  wide,
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
  dismissible?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const controls = useDragControls();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) onClose();
    };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => panelRef.current?.focus(), 50);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, onClose, dismissible]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-[rgb(6_20_14/0.42)] backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={() => dismissible && onClose()}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            drag={dismissible ? "y" : false}
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.7 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onClose();
            }}
            initial={{ y: "100%", opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.6, transition: { duration: 0.24, ease: [0.4, 0, 1, 1] } }}
            transition={{ type: "spring", stiffness: 380, damping: 36, mass: 0.9 }}
            className={cn(
              "relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-surface shadow-[var(--shadow-pop)] outline-none sm:rounded-[28px]",
              wide ? "sm:max-w-2xl" : "sm:max-w-[460px]",
              "max-w-[520px]",
              className,
            )}
          >
            <div
              className="flex cursor-grab touch-none justify-center pb-1 pt-2.5 active:cursor-grabbing sm:hidden"
              onPointerDown={(e) => dismissible && controls.start(e)}
            >
              <span className="h-1.5 w-10 rounded-full bg-line-strong" />
            </div>
            {title || description ? (
              <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-3 sm:pt-6">
                <div className="min-w-0">
                  {title ? (
                    <h2 id={titleId} className="font-display text-[21px] font-semibold leading-tight text-ink">
                      {title}
                    </h2>
                  ) : null}
                  {description ? <p className="mt-1 text-[14px] leading-relaxed text-muted">{description}</p> : null}
                </div>
                {dismissible ? (
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="-mr-2 -mt-1 hidden size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-ink sm:grid"
                  >
                    <X className="size-[18px]" />
                  </button>
                ) : null}
              </div>
            ) : null}
            <div className="safe-bottom overflow-y-auto overscroll-contain px-6 pb-6 pt-2">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
