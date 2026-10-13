"use client";

import { motion } from "motion/react";
import { Bike, UserRound, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";

const items = [
  { href: "/runner", label: "Errands", icon: Bike },
  { href: "/runner/earnings", label: "Earnings", icon: Wallet },
  { href: "/runner/profile", label: "Profile", icon: UserRound },
];

export function RunnerNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/runner/jobs/")) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] px-3 pb-[max(env(safe-area-inset-bottom),10px)]">
      <div className="flex items-center rounded-[26px] border border-line/70 bg-surface/90 p-1.5 shadow-[var(--shadow-raised)] backdrop-blur-xl">
        {items.map((item) => {
          const active = item.href === "/runner" ? pathname === "/runner" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => haptic(5)}
              className={cn("relative flex h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[18px] text-[11px] font-medium", active ? "text-ink" : "text-muted")}
            >
              {active ? <motion.span layoutId="runner-nav" className="absolute inset-0.5 rounded-[18px] bg-sunken" transition={{ type: "spring", stiffness: 500, damping: 38 }} /> : null}
              <Icon className="relative size-[21px]" strokeWidth={active ? 2.3 : 1.9} />
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
