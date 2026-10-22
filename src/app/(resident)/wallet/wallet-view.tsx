"use client";

import { motion } from "motion/react";
import { ArrowDownLeft, ArrowUpRight, Banknote, Gift, RotateCcw, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BankFields, emptyBank, type BankValue } from "@/components/app/bank-form";
import { AnimatedNaira } from "@/components/ui/animated-number";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { naira } from "@/lib/money";
import type { WalletData } from "@/lib/resident";
import { formatDate, formatTime } from "@/lib/time";
import { withdraw } from "../actions";

const META: Record<string, { label: string; icon: typeof ArrowDownLeft; tone: "in" | "out" }> = {
  change: { label: "Change", icon: ArrowDownLeft, tone: "in" },
  refund: { label: "Refund", icon: Undo2, tone: "in" },
  admin_credit: { label: "Credit", icon: Gift, tone: "in" },
  withdrawal_reversal: { label: "Withdrawal returned", icon: RotateCcw, tone: "in" },
  order_payment: { label: "Paid for errand", icon: ArrowUpRight, tone: "out" },
  withdrawal: { label: "Withdrawal", icon: Banknote, tone: "out" },
};

export function WalletView({ data }: { data: WalletData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [bank, setBank] = useState<BankValue>(emptyBank);
  const [pending, start] = useTransition();
  const pendingWithdrawals = data.withdrawals.filter((w) => w.status === "pending_approval" || w.status === "processing");

  return (
    <main className="safe-top px-5 pb-36 pt-4">
      <h1 className="mb-5 font-display text-[30px] font-bold text-ink">Wallet</h1>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[28px] bg-hero p-6 text-hero-ink shadow-[var(--shadow-raised)]"
      >
        <div className="relative z-10">
          <p className="text-[13px] font-medium text-hero-muted">Available balance</p>
          <p className="tnum mt-1 font-display text-[44px] font-bold leading-none tracking-tight">
            <AnimatedNaira kobo={data.balance} />
          </p>
          <p className="mt-3 max-w-[260px] text-[13px] leading-snug text-hero-muted">Change from errands and refunds land here instantly. Use it on your next errand.</p>
          <div className="mt-6 flex gap-2">
            <Link href="/new" className="flex h-11 flex-1 items-center justify-center rounded-2xl bg-white text-[14.5px] font-semibold text-hero">
              Use on an errand
            </Link>
            <button
              onClick={() => setOpen(true)}
              disabled={data.balance < 10000}
              className="flex h-11 items-center justify-center rounded-2xl bg-white/10 px-5 text-[14.5px] font-semibold ring-1 ring-white/15 disabled:opacity-40"
            >
              Withdraw
            </button>
          </div>
        </div>
      </motion.section>

      {pendingWithdrawals.length ? (
        <section className="mt-4 space-y-2">
          {pendingWithdrawals.map((w) => (
            <div key={w.id} className="card flex items-center justify-between p-4">
              <div>
                <p className="text-[14px] font-semibold text-ink">Withdrawal of {naira(w.amount)}</p>
                <p className="text-[12.5px] text-muted">To {w.accountName}</p>
              </div>
              <Badge tone="accent" dot pulse>
                {w.status === "processing" ? "Sending" : "Pending"}
              </Badge>
            </div>
          ))}
        </section>
      ) : null}

      <section className="mt-7">
        <h2 className="mb-3 font-display text-[19px] font-semibold text-ink">History</h2>
        {data.entries.length === 0 ? (
          <div className="card px-6 py-10 text-center">
            <p className="font-display text-[17px] font-semibold text-ink">No activity yet</p>
            <p className="mt-1 text-[13.5px] text-muted">Change from your errands will show up here.</p>
          </div>
        ) : (
          <motion.ul
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.03 } } }}
            className="divide-y divide-line overflow-hidden rounded-[22px] border border-line/70 bg-surface shadow-[var(--shadow-card)]"
          >
            {data.entries.map((e) => {
              const m = META[e.type] ?? META.change;
              const Icon = m.icon;
              const inflow = e.amount > 0;
              return (
                <motion.li key={e.id} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }} className="flex items-center gap-3 px-4 py-3.5">
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-2xl", inflow ? "bg-primary-soft text-primary-soft-ink" : "bg-sunken text-ink-2")}>
                    <Icon className="size-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-medium text-ink">{e.note || m.label}</p>
                    <p className="text-[12.5px] text-muted">
                      {formatDate(e.createdAt)}, {formatTime(e.createdAt)}
                    </p>
                  </div>
                  <span className={cn("tnum shrink-0 font-display text-[15.5px] font-semibold", inflow ? "text-primary" : "text-ink")}>
                    {inflow ? "+" : "−"}
                    {naira(Math.abs(e.amount))}
                  </span>
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </section>

      <Sheet open={open} onClose={() => setOpen(false)} title="Withdraw to your bank" description="We send it within a few hours after a quick check.">
        <div className="space-y-4 pt-2">
          <Field label="Amount" hint={`Available: ${naira(data.balance)}`}>
            <MoneyInput value={amount} onChange={setAmount} />
          </Field>
          <BankFields value={bank} onChange={setBank} />
          <Button
            size="lg"
            block
            loading={pending}
            disabled={!bank.accountName || amount < 10000 || amount > data.balance}
            onClick={() =>
              start(async () => {
                const res = await withdraw({ amount, bankCode: bank.bankCode, bankName: bank.bankName, accountNumber: bank.accountNumber });
                if (!res.ok) return toast.error(res.error);
                toast.success("Withdrawal requested", `${naira(amount)} to ${res.data.accountName}`);
                setOpen(false);
                setAmount(0);
                router.refresh();
              })
            }
          >
            Withdraw {amount ? naira(amount) : ""}
          </Button>
        </div>
      </Sheet>
    </main>
  );
}
