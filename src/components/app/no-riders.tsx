"use client";

import { Bike } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

/** Shown instead of letting someone pay when no rider is online to take the errand. */
export function NoRidersNotice({ beforePayingShop = false }: { beforePayingShop?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="mx-5 mt-2 flex items-start gap-2.5 rounded-2xl bg-accent-soft px-4 py-3 text-[13.5px] text-accent-soft-ink">
      <Bike className="mt-0.5 size-4 shrink-0" />
      <div>
        <p>
          No riders are online right now, so errands can&apos;t be placed and you won&apos;t be charged.
          {beforePayingShop ? " Don't pay the shop yet." : ""} Check back in a few minutes.
        </p>
        <button onClick={() => start(() => router.refresh())} disabled={pending} className="mt-1 font-semibold underline underline-offset-2">
          {pending ? "Checking…" : "Check again"}
        </button>
      </div>
    </div>
  );
}
