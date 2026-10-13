"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Bike, ChevronRight, CircleAlert, MessageCircle, Timer, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { ColumnChart } from "@/components/admin/column-chart";
import { AdminHeader, EmptyRow, Panel } from "@/components/admin/ui";
import { CategoryBadge } from "@/components/brand/category-art";
import { StatusBadge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";
import type { Overview } from "@/lib/admin";
import { cn } from "@/lib/cn";
import { naira } from "@/lib/money";

function Stat({
  label,
  value,
  delta,
  hint,
}: {
  label: string;
  value: string;
  delta?: { value: number; goodWhenUp?: boolean; vs: string; format?: (n: number) => string };
  hint?: string;
}) {
  const up = (delta?.value ?? 0) >= 0;
  const good = delta ? (delta.goodWhenUp === false ? !up : up) : true;
  return (
    <div className="card p-5">
      <p className="text-[13px] font-medium text-muted">{label}</p>
      <p className="mt-2 text-[30px] font-semibold leading-none tracking-tight text-ink">{value}</p>
      {delta ? (
        <p className={cn("mt-2.5 inline-flex items-center gap-1 text-[12.5px] font-semibold", good ? "text-primary" : "text-danger")}>
          {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
          {delta.value >= 0 ? "+" : "−"}
          {(delta.format ?? String)(Math.abs(delta.value))} <span className="font-normal text-muted">vs {delta.vs}</span>
        </p>
      ) : hint ? (
        <p className="mt-2.5 text-[12.5px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function OverviewView({ initial }: { initial: Overview }) {
  const { data } = useSWR<{ overview: Overview }>("/api/admin/overview", { fallbackData: { overview: initial }, refreshInterval: 8000 });
  const o = data?.overview ?? initial;
  const [measure, setMeasure] = useState<"delivered" | "revenue">("delivered");

  const alerts = [
    o.alerts.stuck ? { icon: AlertTriangle, text: `${o.alerts.stuck} errand${o.alerts.stuck > 1 ? "s" : ""} need attention`, href: "/admin/orders?filter=attention", tone: "danger" } : null,
    o.alerts.pendingPayouts ? { icon: Wallet, text: `${o.alerts.pendingPayouts} payout${o.alerts.pendingPayouts > 1 ? "s" : ""} waiting for approval`, href: "/admin/payouts", tone: "accent" } : null,
    o.alerts.failedPayouts ? { icon: CircleAlert, text: `${o.alerts.failedPayouts} failed transfer${o.alerts.failedPayouts > 1 ? "s" : ""}`, href: "/admin/payouts", tone: "danger" } : null,
    o.alerts.unreadChats ? { icon: MessageCircle, text: `${o.alerts.unreadChats} unread message${o.alerts.unreadChats > 1 ? "s" : ""} on errands`, href: "/admin/orders?filter=active", tone: "accent" } : null,
    o.runners.online === 0 ? { icon: Bike, text: "No runners online right now", href: "/admin/runners", tone: "accent" } : null,
  ].filter(Boolean) as Array<{ icon: typeof Wallet; text: string; href: string; tone: "danger" | "accent" }>;

  return (
    <>
      <AdminHeader
        title="Overview"
        description={
          <span className="inline-flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-[var(--animate-pulse-ring)] rounded-full bg-primary" />
              <span className="relative size-2 rounded-full bg-primary" />
            </span>
            Live · {o.runners.online} of {o.runners.total} runners online
          </span>
        }
      />

      <AnimatePresence>
        {alerts.length ? (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mb-6 grid gap-2 sm:grid-cols-2">
            {alerts.map((a) => (
              <Link
                key={a.text}
                href={a.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-[14px] font-medium transition-transform hover:-translate-y-0.5",
                  a.tone === "danger" ? "bg-danger-soft text-danger-soft-ink" : "bg-accent-soft text-accent-soft-ink",
                )}
              >
                <a.icon className="size-[18px] shrink-0" />
                <span className="flex-1">{a.text}</span>
                <ChevronRight className="size-4" />
              </Link>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Delivered today" value={String(o.today.delivered)} delta={{ value: o.today.delivered - o.yesterday.delivered, vs: "yesterday" }} />
        <Stat label="Fee revenue today" value={naira(o.today.revenue)} delta={{ value: o.today.revenue - o.yesterday.revenue, vs: "yesterday", format: naira }} />
        <Stat label="Spent at shops today" value={naira(o.today.gmv)} hint="Paid directly to vendors" />
        <Stat label="Avg. time to deliver" value={o.today.avgMins ? `${o.today.avgMins} min` : "—"} hint="From payment to door, today" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel
          title={measure === "delivered" ? "Errands delivered per day" : "Fee revenue per day"}
          action={
            <Segmented
              value={measure}
              onChange={setMeasure}
              options={[
                { value: "delivered", label: "Errands" },
                { value: "revenue", label: "Revenue" },
              ]}
            />
          }
          bodyClass="px-3 pb-3 pt-5 sm:px-5"
        >
          <ColumnChart
            key={measure}
            data={o.days.map((d) => ({ key: d.key, label: d.label, value: measure === "delivered" ? d.delivered : d.revenue / 100 }))}
            format={(v) => (measure === "delivered" ? `${v} errand${v === 1 ? "" : "s"}` : `₦${Math.round(v).toLocaleString("en-NG")}`)}
            axisFormat={(v) => (measure === "delivered" ? String(Math.round(v)) : v >= 1000 ? `₦${+(v / 1000).toFixed(1)}K` : `₦${Math.round(v)}`)}
          />
          <p className="px-2 pt-1 text-[12px] text-muted">Last 14 days · today highlighted</p>
        </Panel>

        <Panel title="Busiest shops · 7 days" bodyClass="p-5">
          {o.topShops.length ? (
            <ul className="space-y-4">
              {o.topShops.map((s, i) => {
                const max = o.topShops[0].n || 1;
                return (
                  <li key={s.name}>
                    <div className="flex items-baseline justify-between text-[14px]">
                      <span className="truncate font-medium text-ink">{s.name}</span>
                      <span className="tnum text-muted">{s.n}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sunken">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(s.n / max) * 100}%` }}
                        transition={{ duration: 0.8, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full rounded-full bg-primary"
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyRow>No deliveries this week yet.</EmptyRow>
          )}
        </Panel>
      </div>

      <Panel className="mt-6" title={`Live errands · ${o.live.length}`} action={<Link href="/admin/orders" className="text-[13.5px] font-semibold text-primary">All errands</Link>}>
        {o.live.length ? (
          <ul className="divide-y divide-line/70">
            <AnimatePresence initial={false}>
              {o.live.map((l) => (
                <motion.li key={l.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Link href={`/admin/orders/${l.id}`} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2">
                    <CategoryBadge id={l.category} size={42} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-semibold text-ink">
                        #{l.code} · {l.title}
                      </p>
                      <p className="truncate text-[12.5px] text-muted">
                        {l.resident} · Block {l.block}
                        {l.place ? ` · from ${l.place}` : ""}
                        {l.runner ? ` · ${l.runner}` : ""}
                      </p>
                    </div>
                    {l.unread ? (
                      <span className="hidden items-center gap-1 rounded-full bg-accent-soft px-2 py-1 text-[11.5px] font-semibold text-accent-soft-ink sm:inline-flex">
                        <MessageCircle className="size-3.5" /> {l.unread}
                      </span>
                    ) : null}
                    {l.alert ? (
                      <span className="hidden items-center gap-1 rounded-full bg-danger-soft px-2.5 py-1 text-[12px] font-semibold text-danger-soft-ink md:inline-flex">
                        <AlertTriangle className="size-3.5" /> {l.alert}
                      </span>
                    ) : (
                      <span className="hidden items-center gap-1 text-[12.5px] text-muted md:inline-flex">
                        <Timer className="size-3.5" /> {l.ageMins} min
                      </span>
                    )}
                    <StatusBadge status={l.status} />
                  </Link>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        ) : (
          <EmptyRow>No errands running right now.</EmptyRow>
        )}
      </Panel>
    </>
  );
}
