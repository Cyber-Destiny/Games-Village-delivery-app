"use client";

import { motion } from "motion/react";
import { House, Plus, ReceiptText, UserRound, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";

const items = [
  { href: "/home", label: "Home", icon: House },
  { href: "/orders", label: "Errands", icon: ReceiptText },
  { href: "/new", label: "New", icon: Plus, primary: true },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/account", label: "Account", icon: UserRound },
];

const HIDE_ON = [/^\/new/, /^\/orders\/[^/]+/, /^\/shops\//];

export function BottomNav({ activeCount = 0 }: { activeCount?: number }) {
  const pathname = usePathname();
  if (HIDE_ON.some((r) => r.test(pathname))) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] px-3 pb-[max(env(safe-area-inset-bottom),10px)]">
      <div className="flex items-center justify-between rounded-[26px] border border-line/70 bg-surface/90 px-2 py-1.5 shadow-[var(--shadow-raised)] backdrop-blur-xl">
        {items.map((item) => {
          const active = item.href === "/home" ? pathname === "/home" : pathname.startsWith(item.href);
          const Icon = item.icon;
          if (item.primary) {
            return (
              <Link key={item.href} href={item.href} onClick={() => haptic(8)} aria-label="New errand" className="px-1">
                <motion.span
                  whileTap={{ scale: 0.9 }}
                  className="grid size-[52px] place-items-center rounded-[18px] bg-primary text-primary-ink shadow-[var(--shadow-button)]"
                >
                  <Icon className="size-6" strokeWidth={2.4} />
                </motion.span>
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => haptic(5)}
              className={cn(
                "relative flex h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[18px] text-[11px] font-medium transition-colors",
                active ? "text-ink" : "text-muted hover:text-ink-2",
              )}
            >
              {active ? (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-x-1.5 inset-y-1 rounded-[16px] bg-sunken"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              ) : null}
              <span className="relative">
                <Icon className="size-[21px]" strokeWidth={active ? 2.3 : 1.9} />
                {item.href === "/orders" && activeCount > 0 ? (
                  <span className="absolute -right-2 -top-1.5 grid size-[17px] place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-ink ring-2 ring-surface">
                    {activeCount}
                  </span>
                ) : null}
              </span>
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
