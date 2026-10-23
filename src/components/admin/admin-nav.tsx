"use client";

import { motion } from "motion/react";
import { Bike, Headset, LayoutDashboard, LogOut, ReceiptText, Settings, Store, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";
import { signOut } from "@/app/(auth)/actions";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, badge: null },
  { href: "/admin/orders", label: "Errands", icon: ReceiptText, badge: "orders" },
  { href: "/admin/runners", label: "Runners", icon: Bike, badge: null },
  { href: "/admin/vendors", label: "Shops", icon: Store, badge: null },
  { href: "/admin/payouts", label: "Payouts", icon: Wallet, badge: "payouts" },
  { href: "/admin/residents", label: "Residents", icon: Users, badge: null },
  { href: "/admin/support", label: "Support", icon: Headset, badge: "support" },
  { href: "/admin/settings", label: "Settings", icon: Settings, badge: null },
] as const;

type Badges = { payouts: number; orders: number; support: number };

function useBadges(initial: Badges) {
  const { data } = useSWR<{ badges: Badges }>("/api/admin/overview", { refreshInterval: 15000, fallbackData: { badges: initial } as { badges: Badges } });
  return data?.badges ?? initial;
}

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export function AdminSidebar({ name, badges: initial }: { name: string; badges: Badges }) {
  const pathname = usePathname();
  const badges = useBadges(initial);
  return (
    <aside className="sticky top-0 hidden h-dvh w-[252px] shrink-0 flex-col border-r border-line/70 bg-surface-2 px-4 py-5 lg:flex">
      <Link href="/admin" className="px-2">
        <Logo />
      </Link>
      <p className="mt-1 px-2 text-[12px] font-medium uppercase tracking-[0.14em] text-faint">Admin console</p>
      <nav className="mt-7 space-y-1">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const count = item.badge ? badges[item.badge] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("relative flex h-11 items-center gap-3 rounded-xl px-3 text-[14.5px] font-medium transition-colors", active ? "text-ink" : "text-muted hover:bg-sunken/60 hover:text-ink")}
            >
              {active ? <motion.span layoutId="admin-nav" className="absolute inset-0 rounded-xl bg-surface shadow-[var(--shadow-card)] ring-1 ring-line/70" transition={{ type: "spring", stiffness: 500, damping: 40 }} /> : null}
              <item.icon className="relative size-[19px]" strokeWidth={active ? 2.2 : 1.9} />
              <span className="relative flex-1">{item.label}</span>
              {count ? <span className="relative grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-ink">{count}</span> : null}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex items-center gap-3 rounded-2xl border border-line/70 bg-surface p-3">
        <Avatar name={name} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-ink">{name}</p>
          <p className="text-[12px] text-muted">Admin</p>
        </div>
        <form action={signOut}>
          <button aria-label="Sign out" className="grid size-9 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink">
            <LogOut className="size-4" />
          </button>
        </form>
      </div>
    </aside>
  );
}

export function AdminTopNav({ badges: initial }: { badges: Badges }) {
  const pathname = usePathname();
  const badges = useBadges(initial);
  return (
    <div className="safe-top sticky top-0 z-30 border-b border-line/70 bg-bg/85 backdrop-blur-xl lg:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Logo size={30} />
        <span className="rounded-full bg-hero px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-hero-ink">Admin</span>
      </div>
      <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const count = item.badge ? badges[item.badge] : 0;
          return (
            <Link key={item.href} href={item.href} className={cn("relative flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium", active ? "text-bg" : "text-ink-2")}>
              {active ? <motion.span layoutId="admin-top" className="absolute inset-0 rounded-full bg-ink" /> : null}
              <item.icon className="relative size-4" />
              <span className="relative">{item.label}</span>
              {count ? <span className="relative grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-ink">{count}</span> : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
