"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { LogoMark } from "@/components/brand/logo";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="flex flex-col items-center">
        <LogoMark size={56} />
        <h1 className="mt-8 font-display text-[26px] font-bold text-ink">Something went wrong</h1>
        <p className="mt-2 max-w-sm text-[15px] text-muted">We couldn&apos;t load this screen. Check your connection and try again.</p>
        <button onClick={reset} className="mt-8 inline-flex h-12 items-center gap-2 rounded-2xl bg-primary px-6 font-semibold text-primary-ink shadow-[var(--shadow-button)]">
          <RotateCcw className="size-4" /> Try again
        </button>
      </div>
    </main>
  );
}
