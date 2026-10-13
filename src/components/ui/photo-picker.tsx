"use client";

import { AnimatePresence, motion } from "motion/react";
import { Camera, X } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { uploadPhoto } from "@/lib/upload-client";
import { Spinner } from "./spinner";
import { toast } from "./toast";

export function PhotoPicker({
  value,
  onChange,
  label = "Add a photo",
  hint,
  className,
}: {
  value: { id: string; url: string } | null;
  onChange: (v: { id: string; url: string } | null) => void;
  label?: string;
  hint?: string;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className={className}>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          try {
            onChange(await uploadPhoto(file));
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Upload failed");
          } finally {
            setBusy(false);
          }
        }}
      />
      <AnimatePresence mode="wait" initial={false}>
        {value ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative inline-block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value.url} alt="" className="h-28 w-28 rounded-2xl object-cover ring-1 ring-line" />
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label="Remove photo"
              className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full bg-ink text-bg shadow"
            >
              <X className="size-4" />
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="add"
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => input.current?.click()}
            disabled={busy}
            className={cn(
              "flex w-full items-center gap-3 rounded-2xl border border-dashed border-line-strong bg-surface-2 px-4 py-3.5 text-left transition-colors hover:bg-sunken/60",
            )}
          >
            <span className="grid size-10 place-items-center rounded-xl bg-surface shadow-[var(--shadow-card)]">
              {busy ? <Spinner className="size-5 text-primary" /> : <Camera className="size-5 text-ink-2" />}
            </span>
            <span>
              <span className="block text-[14px] font-semibold text-ink">{busy ? "Uploading…" : label}</span>
              {hint ? <span className="block text-[12.5px] text-muted">{hint}</span> : null}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
