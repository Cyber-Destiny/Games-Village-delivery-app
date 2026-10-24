"use client";

import { Check, Clock3 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

/** "Has the payment reached you?" — the shop's answer decides whether a rider is sent. */
export function ConfirmPayment({
  orderId,
  code,
  collectAs,
  onDone,
  className,
}: {
  orderId: string;
  code: string;
  collectAs: string | null;
  onDone: () => void;
  className?: string;
}) {
  const [busy, setBusy] = useState<"yes" | "no" | null>(null);
  async function answer(received: boolean) {
    setBusy(received ? "yes" : "no");
    try {
      const res = await fetch(`/api/shop-inbox/pickups/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ received }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't save that");
      toast.success(received ? "Confirmed. We're sending a rider." : "We've told the customer.");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save that");
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className={cn("rounded-[18px] border border-accent bg-accent-soft p-4 text-accent-soft-ink", className)}>
      <p className="text-[14.5px] font-semibold leading-snug">
        Has the payment for order #{code}
        {collectAs ? <> ({collectAs})</> : null} reached you?
      </p>
      <p className="mt-0.5 text-[13px] leading-snug opacity-80">We send the rider once you confirm.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button size="md" loading={busy === "yes"} disabled={!!busy} onClick={() => answer(true)}>
          <Check className="size-4" /> Yes, received
        </Button>
        <Button size="md" variant="secondary" loading={busy === "no"} disabled={!!busy} onClick={() => answer(false)}>
          <Clock3 className="size-4" /> Not yet
        </Button>
      </div>
    </div>
  );
}
