"use client";

import { MotionConfig } from "motion/react";
import { SWRConfig } from "swr";
import { Toaster } from "@/components/ui/toast";

async function fetcher(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Signed out");
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error || "Request failed");
  return json;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 380, damping: 32 }}>
      <SWRConfig value={{ fetcher, revalidateOnFocus: true, dedupingInterval: 1500, keepPreviousData: true }}>
        {children}
        <Toaster />
      </SWRConfig>
    </MotionConfig>
  );
}
