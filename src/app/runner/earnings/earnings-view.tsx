"use client";

import { motion } from "motion/react";
import { Gift, Landmark, Plus } from "lucide-react";
import { CategoryThumb } from "@/components/brand/photo";
import { AnimatedNaira } from "@/components/ui/animated-number";
import { Badge } from "@/components/ui/badge";
import { ProgressRing } from "@/components/ui/progress-ring";
import { naira } from "@/lib/money";
import type { getRunnerEarnings, RunnerState } from "@/lib/orders/queries";
import { formatDate, formatTime } from "@/lib/time";

type Data = Awaited<ReturnType<typeof getRunnerEarnings>>;

const PAYOUT_TONE = { success: "success", manual: "success", processing: "accent", pending_approval: "accent", failed: "danger", reversed: "danger", rejected: "danger" } as const;

export function EarningsView({ state, data }: { state: RunnerState; data: Data }) {
  return (
    <main className="safe-top px-5 pb-36 pt-4">
      <h1 className="mb-5 font-display text-[30px] font-bold text-ink">Earnings</h1>

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[28px] bg-hero p-6 text-hero-ink shadow-[var(--shadow-raised)]">
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div>
            <p className="text-[13px] text-hero-muted">Waiting to be paid</p>
            <p className="tnum mt-1 font-display text-[40px] font-bold leading-none">
              <AnimatedNaira kobo={state.unpaid} />
            </p>
            <p className="mt-3 text-[13px] text-hero-muted">You keep {state.commissionPct}% of every service fee. Paid to your bank weekly.</p>
          </div>
          {state.week.target ? (
            <ProgressRing value={Math.min(1, state.week.jobs / state.week.target)} size={92} stroke={8} track="rgb(255 255 255 / 0.12)" color="var(--accent)">
              <div className="text-center">
                <p className="tnum font-display text-[20px] font-bold leading-none">{state.week.jobs}</p>
                <p className="text-[10.5px] text-hero-muted">/{state.week.target} wk</p>
              </div>
            </ProgressRing>
          ) : null}
        </div>
      </motion.section>

      {data.payouts.length ? (
        <section className="mt-6">
          <h2 className="mb-3 font-display text-[18px] font-semibold text-ink">Payouts</h2>
          <div className="divide-y divide-line overflow-hidden rounded-[22px] border border-line/70 bg-surface shadow-[var(--shadow-card)]">
            {data.payouts.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3.5">
                <span className="grid size-10 place-items-center rounded-2xl bg-sunken text-ink-2">
                  <Landmark className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="tnum text-[15px] font-semibold text-ink">{naira(p.amount)}</p>
                  <p className="text-[12.5px] text-muted">
                    {p.bankName} {p.accountNumber} · {formatDate(p.createdAt)}
                  </p>
                </div>
                <Badge tone={PAYOUT_TONE[p.status as keyof typeof PAYOUT_TONE] ?? "neutral"}>{p.status === "manual" ? "Paid" : p.status.replace("_", " ")}</Badge>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="mb-3 font-display text-[18px] font-semibold text-ink">History</h2>
        {data.earnings.length === 0 ? (
          <div className="card p-8 text-center text-[14px] text-muted">Your earnings will show up here after your first errand.</div>
        ) : (
          <motion.div initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.025 } } }} className="divide-y divide-line overflow-hidden rounded-[22px] border border-line/70 bg-surface shadow-[var(--shadow-card)]">
            {data.earnings.map((e) => (
              <motion.div key={e.id} variants={{ h: { opacity: 0, y: 6 }, s: { opacity: 1, y: 0 } }} className="flex items-center gap-3 px-4 py-3">
                {e.type === "bonus" ? (
                  <span className="grid size-10 place-items-center rounded-2xl bg-accent-soft text-accent-soft-ink">
                    <Gift className="size-[18px]" />
                  </span>
                ) : e.category ? (
                  <CategoryThumb id={e.category} size={40} />
                ) : (
                  <span className="grid size-10 place-items-center rounded-2xl bg-sunken">
                    <Plus className="size-4" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-medium text-ink">{e.type === "bonus" ? e.note ?? "Weekly bonus" : e.code ? `Errand #${e.code}` : e.note ?? "Adjustment"}</p>
                  <p className="text-[12.5px] text-muted">
                    {formatDate(e.createdAt)}, {formatTime(e.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="tnum font-display text-[15px] font-semibold text-primary">+{naira(e.amount)}</p>
                  <p className="text-[11px] text-muted">{e.paid ? "Paid" : "Unpaid"}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>
    </main>
  );
}
