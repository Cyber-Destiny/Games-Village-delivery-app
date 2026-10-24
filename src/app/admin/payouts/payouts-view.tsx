"use client";

import { AnimatePresence, motion } from "motion/react";
import { Bike, Check, FlaskConical, Landmark, RotateCcw, Store, Wallet, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminHeader, EmptyRow, Panel } from "@/components/admin/ui";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import type { AdminPayout, getPayoutsAdmin } from "@/lib/admin";
import { naira } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { approve, markManual, payRunnerNow, reject, retry } from "../actions";

type Data = Awaited<ReturnType<typeof getPayoutsAdmin>>;

const TYPE = {
  vendor: { label: "Shop", icon: Store },
  runner: { label: "Runner", icon: Bike },
  withdrawal: { label: "Wallet withdrawal", icon: Wallet },
} as const;

const tone = (s: string) => (["success", "manual"].includes(s) ? "success" : ["failed", "reversed", "rejected"].includes(s) ? "danger" : "accent") as "success" | "danger" | "accent";

/** `manual`: Paystack can't send transfers (Starter), so payouts are paid from the admin's bank app. */
export function PayoutsView({ data, mode, manual }: { data: Data; mode: "off" | "demo" | "test" | "live"; manual: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rejecting, setRejecting] = useState<AdminPayout | null>(null);
  const [note, setNote] = useState("");
  const owed = data.runners.filter((r) => r.unpaid > 0);
  const totalOwed = owed.reduce((a, r) => a + r.unpaid, 0);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return toast.error((res as { error: string }).error);
      toast.success(msg);
      router.refresh();
    });

  return (
    <>
      <AdminHeader title="Payouts" description="Money going out: shops, runners and wallet withdrawals." />

      {manual ? (
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-primary-soft px-4 py-3 text-[13.5px] text-primary-soft-ink">
          <Landmark className="mt-0.5 size-4 shrink-0" />
          <p>
            Your Paystack plan collects payments but can&apos;t send transfers. Pay each payout below from your bank app, then tap <strong>Mark as paid</strong>. The
            runner or resident gets a notification.
          </p>
        </div>
      ) : null}

      {mode !== "live" ? (
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-accent-soft px-4 py-3 text-[13.5px] text-accent-soft-ink">
          <FlaskConical className="mt-0.5 size-4 shrink-0" />
          <p>
            {mode === "off"
              ? "Paystack isn't connected yet, so no payments come in and no transfers can be sent."
              : mode === "demo"
                ? "Demo mode — no Paystack key is set, so transfers are simulated and settle after a few seconds."
                : "Paystack test key — transfers go through Paystack's test environment. No real money moves."}
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Panel title={`Needs your action · ${data.needsAction.length}`}>
          {data.needsAction.length === 0 ? (
            <EmptyRow>All clear. Nothing waiting for you.</EmptyRow>
          ) : (
            <ul className="divide-y divide-line/70">
              <AnimatePresence initial={false}>
                {data.needsAction.map((p) => {
                  const T = TYPE[p.type];
                  const failed = ["failed", "reversed"].includes(p.status);
                  return (
                    <motion.li key={p.id} layout exit={{ opacity: 0, height: 0 }} className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sunken text-ink-2">
                          <T.icon className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="tnum text-[16px] font-semibold text-ink">{naira(p.amount)}</p>
                          <p className="truncate text-[13px] text-muted">
                            {T.label}
                            {p.code ? (
                              <>
                                {" · "}
                                <Link href={`/admin/orders/${p.orderId}`} className="font-medium text-primary hover:underline">
                                  #{p.code}
                                </Link>
                              </>
                            ) : null}
                            {p.who ? ` · by ${p.who}` : ""}
                          </p>
                          <p className="mt-1 truncate text-[13px] text-ink-2">
                            <Landmark className="mr-1 inline size-3.5 text-muted" />
                            {p.accountName} · {p.bankName} {p.accountNumber ? (manual ? <span className="tnum font-semibold">{p.accountNumber}</span> : `••••${p.accountNumber.slice(-4)}`) : ""}
                          </p>
                          {p.failureReason ? <p className="mt-1 text-[12.5px] text-danger">{p.failureReason}</p> : null}
                          {p.type === "vendor" && p.status === "pending_approval" ? (
                            <p className="mt-1 text-[12.5px] text-accent-soft-ink">Entered by the runner — check the name matches the shop and look at the receipt before approving.</p>
                          ) : null}
                        </div>
                        <Badge tone={tone(p.status)}>{p.status.replace("_", " ")}</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 pl-[52px]">
                        {failed ? (
                          p.type === "vendor" ? (
                            <Button size="sm" disabled={pending} onClick={() => run(() => retry(p.id), "Retrying transfer")}>
                              <RotateCcw className="size-3.5" /> Retry
                            </Button>
                          ) : null
                        ) : manual ? null : (
                          <Button size="sm" disabled={pending} onClick={() => run(() => approve(p.id), "Transfer sent")}>
                            <Check className="size-3.5" /> Approve & send
                          </Button>
                        )}
                        <Button size="sm" variant={manual ? "primary" : "secondary"} disabled={pending} onClick={() => run(() => markManual(p.id), "Recorded as paid")}>
                          {manual ? (
                            <>
                              <Check className="size-3.5" /> Mark as paid
                            </>
                          ) : (
                            "Paid another way"
                          )}
                        </Button>
                        {!failed ? (
                          <Button size="sm" variant="ghost" disabled={pending} onClick={() => setRejecting(p)}>
                            <X className="size-3.5" /> Decline
                          </Button>
                        ) : null}
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </Panel>

        <Panel
          title="Runner earnings owed"
          action={
            owed.length > 1 ? (
              <Button
                size="sm"
                variant="soft"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    for (const r of owed.filter((r) => r.bank)) {
                      const res = await payRunnerNow(r.id);
                      if (!res.ok) toast.error(`${r.name}: ${res.error}`);
                    }
                    toast.success(manual ? "Added to Needs your action" : "Payouts sent");
                    router.refresh();
                  })
                }
              >
                Pay all {naira(totalOwed)}
              </Button>
            ) : null
          }
        >
          {owed.length === 0 ? (
            <EmptyRow>No earnings waiting to be paid.</EmptyRow>
          ) : (
            <ul className="divide-y divide-line/70">
              {owed.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3.5">
                  <Avatar name={r.name} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{r.name}</p>
                    <p className="truncate text-[12.5px] text-muted">{r.bank ? `${r.bank.bankName} ••••${r.bank.accountNumber?.slice(-4)}` : "No payout account"}</p>
                  </div>
                  <Button
                    size="sm"
                    disabled={!r.bank || pending}
                    onClick={() => run(() => payRunnerNow(r.id), manual ? "Added to Needs your action. Pay it from your bank app." : `Sending to ${r.name.split(" ")[0]}`)}
                  >
                    {manual ? "Prepare" : "Pay"} {naira(r.unpaid)}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel className="mt-6" title="History">
        {data.history.length === 0 ? (
          <EmptyRow>No payouts yet.</EmptyRow>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[14px]">
              <thead>
                <tr className="border-b border-line/70 text-[12px] font-semibold uppercase tracking-wider text-muted">
                  <th className="px-5 py-3">Type</th>
                  <th className="px-3 py-3">To</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-right">When</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((p) => {
                  const T = TYPE[p.type];
                  return (
                    <tr key={p.id} className="border-b border-line/50 last:border-0">
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-2 font-medium text-ink">
                          <T.icon className="size-4 text-muted" /> {T.label}
                          {p.code ? (
                            <Link href={`/admin/orders/${p.orderId}`} className="text-[13px] text-primary hover:underline">
                              #{p.code}
                            </Link>
                          ) : null}
                        </span>
                      </td>
                      <td className="max-w-[260px] truncate px-3 py-3 text-ink-2">{p.accountName ?? "—"}</td>
                      <td className="px-3 py-3">
                        <Badge tone={tone(p.status)}>{p.status === "manual" ? "paid manually" : p.status.replace("_", " ")}</Badge>
                      </td>
                      <td className="tnum px-3 py-3 text-right font-medium text-ink">{naira(p.amount)}</td>
                      <td className="tnum px-5 py-3 text-right text-[13px] text-muted">{formatDateTime(p.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Sheet open={!!rejecting} onClose={() => setRejecting(null)} title="Decline this payout?" description={rejecting?.type === "withdrawal" ? "The money goes back to the resident's wallet." : "The runner will be asked to check the details and submit again."}>
        <div className="space-y-4 pt-2">
          <Input placeholder="Reason (shown to them)" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button
            variant="danger"
            size="lg"
            block
            loading={pending}
            onClick={() =>
              rejecting &&
              start(async () => {
                const res = await reject(rejecting.id, note);
                if (!res.ok) return toast.error(res.error);
                toast.success("Declined");
                setRejecting(null);
                setNote("");
                router.refresh();
              })
            }
          >
            Decline payout
          </Button>
        </div>
      </Sheet>
    </>
  );
}
