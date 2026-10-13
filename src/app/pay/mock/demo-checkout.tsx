"use client";

import { AnimatePresence, motion } from "motion/react";
import { Building2, Check, CreditCard, FlaskConical, Hash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { naira } from "@/lib/money";
import { completeDemoPayment } from "./actions";

const methods = [
  { id: "card", label: "Card", icon: CreditCard },
  { id: "transfer", label: "Transfer", icon: Building2 },
  { id: "ussd", label: "USSD", icon: Hash },
];

export function DemoCheckout(props: {
  reference: string;
  amount: number;
  orderId: string | null;
  code: string;
  purpose: string;
  alreadyPaid: boolean;
}) {
  const router = useRouter();
  const [method, setMethod] = useState("card");
  const [done, setDone] = useState(props.alreadyPaid);
  const [pending, start] = useTransition();
  const back = props.orderId ? `/orders/${props.orderId}` : "/orders";

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-[400px] overflow-hidden rounded-[28px] bg-surface shadow-[var(--shadow-pop)] ring-1 ring-line/60"
      >
        <div className="flex items-center gap-2 bg-accent-soft px-5 py-3 text-[13px] font-medium text-accent-soft-ink">
          <FlaskConical className="size-4" /> Demo checkout — no real money moves
        </div>
        <div className="p-6">
          <div className="flex items-center gap-3">
            <LogoMark size={40} />
            <div>
              <p className="text-[13px] text-muted">{props.purpose === "topup" ? "Extra for errand" : "Errand"} #{props.code}</p>
              <p className="font-display text-[30px] font-bold leading-none tracking-tight text-ink">{naira(props.amount)}</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {done ? (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 380, damping: 16 }}
                  className="grid size-20 place-items-center rounded-full bg-primary text-primary-ink"
                >
                  <Check className="size-10" strokeWidth={3} />
                </motion.div>
                <p className="mt-4 font-display text-[20px] font-semibold text-ink">Payment successful</p>
                <p className="text-[14px] text-muted">Taking you back…</p>
              </motion.div>
            ) : (
              <motion.div key="form" exit={{ opacity: 0 }}>
                <p className="mt-7 text-[13px] font-medium text-muted">Pay with</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {methods.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMethod(m.id)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-2xl border py-3.5 text-[13px] font-medium transition-colors",
                        method === m.id ? "border-primary bg-primary-soft text-primary-soft-ink" : "border-line text-ink-2 hover:bg-surface-2",
                      )}
                    >
                      <m.icon className="size-5" />
                      {m.label}
                    </button>
                  ))}
                </div>
                <Button
                  size="xl"
                  block
                  className="mt-6"
                  loading={pending}
                  onClick={() =>
                    start(async () => {
                      await new Promise((r) => setTimeout(r, 900));
                      const res = await completeDemoPayment(props.reference);
                      if (!res.ok) return toast.error(res.error);
                      setDone(true);
                      setTimeout(() => router.replace(`${back}?paid=1`), 1100);
                    })
                  }
                >
                  Pay {naira(props.amount)}
                </Button>
                <button onClick={() => router.replace(back)} className="mt-3 w-full py-2 text-[14px] font-medium text-muted hover:text-ink">
                  Cancel
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </main>
  );
}
