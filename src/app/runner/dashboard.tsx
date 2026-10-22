"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, BellRing, Landmark, MapPin, Moon, Star, Store, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import useSWR from "swr";
import { CategoryThumb } from "@/components/brand/photo";
import { AnimatedNaira } from "@/components/ui/animated-number";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { getCategory } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import { naira } from "@/lib/money";
import type { RunnerState } from "@/lib/orders/queries";
import { STATUS_LABEL } from "@/lib/orders/status";
import { formatTime } from "@/lib/time";
import { setOnline } from "./actions";

const ease = [0.22, 1, 0.36, 1] as const;

/** A short two-tone chime so runners hear new jobs. */
function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.type = "sine";
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.4);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.18);
      o.stop(ctx.currentTime + i * 0.18 + 0.45);
    });
  } catch {
    // audio not available
  }
}

export function useCountdown(from: string | null, seconds: number) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (!from) return;
    const update = () => setLeft(Math.max(0, Math.round(seconds - (Date.now() - new Date(from).getTime()) / 1000)));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [from, seconds]);
  return left;
}

export function RunnerDashboard({ name, initial }: { name: string; initial: RunnerState }) {
  const { data, mutate } = useSWR<{ state: RunnerState }>("/api/runner/state", { fallbackData: { state: initial }, refreshInterval: 5000 });
  const s = data?.state ?? initial;
  const [pending, start] = useTransition();
  const lastJob = useRef<string | null>(initial.activeJob?.status === "assigned" ? initial.activeJob.id : null);

  const job = s.activeJob;
  const isNew = job?.status === "assigned";

  useEffect(() => {
    if (isNew && job && lastJob.current !== job.id) {
      lastJob.current = job.id;
      chime();
      haptic([60, 80, 60, 80, 120]);
      toast.success("New errand!", "Tap to accept it.");
    }
  }, [isNew, job]);

  const toggle = (v: boolean) =>
    start(async () => {
      await mutate({ state: { ...s, online: v } }, { revalidate: false });
      const res = await setOnline(v);
      if (!res.ok) toast.error(res.error);
      mutate();
    });

  const weekProgress = s.week.target ? Math.min(1, s.week.jobs / s.week.target) : 0;

  return (
    <main className="safe-top px-5 pb-36 pt-4">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-[14px] text-muted">Runner</p>
          <h1 className="font-display text-[30px] font-bold leading-tight text-ink">Hi, {name.split(" ")[0]}</h1>
        </div>
        <div className="mt-2 flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold text-ink shadow-[var(--shadow-card)]">
          <Star className="size-4 fill-accent text-accent" />
          {s.rating ? s.rating.toFixed(1) : "New"}
          <span className="font-normal text-muted">({s.ratingCount})</span>
        </div>
      </header>

      {/* online toggle */}
      <motion.section
        layout
        className={cn(
          "relative mt-5 overflow-hidden rounded-[28px] p-5 transition-colors duration-500",
          s.online ? "bg-hero text-hero-ink shadow-[var(--shadow-raised)]" : "border border-line bg-surface shadow-[var(--shadow-card)]",
        )}
      >
        {s.online ? (
          <div className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2">
            {[0, 0.8, 1.6].map((d) => (
              <span
                key={d}
                className="absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 animate-[var(--animate-pulse-ring)] rounded-full border-2 border-accent/50"
                style={{ animationDelay: `${d}s` }}
              />
            ))}
          </div>
        ) : null}
        <div className="relative z-10 flex items-center gap-4">
          <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl", s.online ? "bg-accent text-accent-ink" : "bg-sunken text-ink-2")}>
            {s.online ? <Zap className="size-6" /> : <Moon className="size-6" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[19px] font-semibold">{s.online ? "You're online" : "You're offline"}</p>
            <p className={cn("text-[13px] leading-snug", s.online ? "text-hero-muted" : "text-muted")}>
              {s.online ? (job ? "On an errand right now" : "Waiting for the next errand…") : "Go online to start getting errands"}
            </p>
          </div>
          <Switch size="lg" checked={s.online} onChange={toggle} disabled={pending} label="Online" />
        </div>
      </motion.section>

      {/* active job */}
      <AnimatePresence mode="popLayout">
        {job ? (
          <motion.section key={job.id} initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="mt-4">
            <ActiveJobCard job={job} />
          </motion.section>
        ) : null}
      </AnimatePresence>

      {!s.hasBank ? (
        <Link href="/runner/profile" className="mt-4 flex items-center gap-3 rounded-2xl bg-accent-soft px-4 py-3 text-[13.5px] text-accent-soft-ink">
          <Landmark className="size-5 shrink-0" />
          <span className="flex-1">Add your bank account so we can pay your earnings.</span>
          <ArrowRight className="size-4" />
        </Link>
      ) : null}

      {/* stats */}
      <section className="mt-5 grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-[12.5px] font-medium text-muted">Today</p>
          <p className="tnum mt-1 font-display text-[26px] font-bold leading-none text-ink">
            <AnimatedNaira kobo={s.today.earned} />
          </p>
          <p className="mt-1.5 text-[12.5px] text-muted">
            {s.today.jobs} errand{s.today.jobs === 1 ? "" : "s"}
          </p>
        </div>
        <Link href="/runner/earnings" className="card p-4">
          <p className="text-[12.5px] font-medium text-muted">To be paid</p>
          <p className="tnum mt-1 font-display text-[26px] font-bold leading-none text-ink">
            <AnimatedNaira kobo={s.unpaid} />
          </p>
          <p className="mt-1.5 text-[12.5px] text-muted">Paid out weekly</p>
        </Link>
      </section>

      {s.week.target > 0 ? (
        <section className="card mt-3 flex items-center gap-5 p-5">
          <ProgressRing value={weekProgress} size={96} stroke={9} color={s.week.bonusEarned ? "var(--accent)" : "var(--primary)"}>
            <div className="text-center">
              <p className="tnum font-display text-[22px] font-bold leading-none text-ink">{s.week.jobs}</p>
              <p className="text-[11px] text-muted">of {s.week.target}</p>
            </div>
          </ProgressRing>
          <div className="min-w-0">
            <p className="font-display text-[17px] font-semibold leading-snug text-ink">
              {s.week.bonusEarned ? "Weekly bonus earned" : `${Math.max(0, s.week.target - s.week.jobs)} more for a ${naira(s.week.bonus)} bonus`}
            </p>
            <p className="mt-1 text-[13px] text-muted">This week: {naira(s.week.earned)} earned</p>
          </div>
        </section>
      ) : null}

      {s.recent.length ? (
        <section className="mt-6">
          <h2 className="mb-3 font-display text-[18px] font-semibold text-ink">Recent</h2>
          <div className="divide-y divide-line overflow-hidden rounded-[22px] border border-line/70 bg-surface shadow-[var(--shadow-card)]">
            {s.recent.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <CategoryThumb id={r.category} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-medium text-ink">{r.title}</p>
                  <p className="text-[12.5px] text-muted">
                    Block {r.block} · {r.deliveredAt ? formatTime(r.deliveredAt) : ""}
                  </p>
                </div>
                {r.rating ? (
                  <span className="flex items-center gap-1 text-[13px] font-semibold text-ink-2">
                    <Star className="size-3.5 fill-accent text-accent" /> {r.rating}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function ActiveJobCard({ job }: { job: NonNullable<RunnerState["activeJob"]> }) {
  const isNew = job.status === "assigned";
  const left = useCountdown(isNew ? job.at.assigned : null, 180);
  const where = job.kind === "pickup" ? job.pickupFrom : job.vendorName ?? "Any shop";
  return (
    <Link href={`/runner/jobs/${job.id}`}>
      <motion.div
        whileTap={{ scale: 0.98 }}
        className={cn("overflow-hidden rounded-[28px] bg-surface shadow-[var(--shadow-raised)]", isNew ? "ring-[3px] ring-accent" : "ring-1 ring-line/70")}
      >
        {isNew ? (
          <div className="flex items-center justify-between bg-accent px-5 py-2.5 text-accent-ink">
            <span className="flex items-center gap-2 text-[13.5px] font-bold">
              <motion.span animate={{ rotate: [0, -14, 12, -8, 0] }} transition={{ repeat: Infinity, duration: 1.2, repeatDelay: 0.6 }}>
                <BellRing className="size-4" />
              </motion.span>
              New errand — accept now
            </span>
            <span className="tnum font-display text-[15px] font-bold">
              {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
            </span>
          </div>
        ) : null}
        <div className="flex items-center gap-4 border-b border-line p-4">
          <CategoryThumb id={job.category} size={56} radius={14} />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-2">{isNew ? jobLabel(job) : STATUS_LABEL[job.status]}</p>
            <p className="truncate font-display text-[19px] font-semibold text-ink">
              {job.items.length ? `${job.items.length} item${job.items.length > 1 ? "s" : ""}` : jobLabel(job)} · #{job.code}
            </p>
          </div>
        </div>
        <div className="space-y-2.5 p-4">
          <div className="flex items-center gap-2.5 text-[14px] text-ink-2">
            <Store className="size-4 shrink-0 text-muted" />
            <span className="truncate">{where}</span>
          </div>
          <div className="flex items-center gap-2.5 text-[14px] text-ink-2">
            <MapPin className="size-4 shrink-0 text-muted" />
            <span className="truncate">
              {job.deliverTo ?? `Block ${job.drop.block}, House ${job.drop.house}`} · {job.resident.firstName}
            </span>
          </div>
          <div className="flex items-center justify-between pt-2">
            {job.money.budget + job.money.topupTotal > 0 ? (
              <span className="text-[13px] text-muted">
                Limit <span className="tnum font-semibold text-ink">{naira(job.money.budget + job.money.topupTotal)}</span>
              </span>
            ) : (
              <span className="text-[13px] text-muted">Nothing to buy</span>
            )}
            <span className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-[14px] font-semibold text-primary-ink">
              {isNew ? "View & accept" : "Open"} <ArrowRight className="size-4" />
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

function jobLabel(job: { category: string; collectAs: string | null }) {
  return job.collectAs ? "Collect a paid order" : getCategory(job.category).label;
}
