"use client";

import { motion } from "motion/react";
import { Gift, Moon, Phone, Search, UserCheck, UserX } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { AdminHeader, EmptyRow, Panel } from "@/components/admin/ui";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import type { AdminResident } from "@/lib/admin";
import { naira } from "@/lib/money";
import { formatPhoneLocal } from "@/lib/phone";
import { timeAgo } from "@/lib/time";
import { creditWallet, setResidentActive } from "../actions";

export function ResidentsView({ residents, q }: { residents: AdminResident[]; q: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(q);
  const [view, setView] = useState<"all" | "quiet">("all");
  const [crediting, setCrediting] = useState<AdminResident | null>(null);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (query === q) return;
    const t = setTimeout(() => start(() => router.replace(query ? `${pathname}?q=${encodeURIComponent(query)}` : pathname)), 300);
    return () => clearTimeout(t);
  }, [query, q, pathname, router]);

  const quiet = useMemo(() => residents.filter((r) => r.quiet), [residents]);
  const list = view === "quiet" ? quiet : residents;

  return (
    <>
      <AdminHeader title="Residents" description={`${residents.length} people have signed up.`} />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "all", label: "Everyone" },
            { value: "quiet", label: "Gone quiet", count: quiet.length },
          ]}
        />
        <div className="w-full lg:w-80">
          <Input leading={pending ? <Spinner className="size-4" /> : <Search className="size-4" />} placeholder="Name, phone or block" value={query} onChange={(e) => setQuery(e.target.value)} className="h-11" />
        </div>
      </div>

      {view === "quiet" ? (
        <div className="mb-4 flex items-start gap-3 rounded-2xl bg-accent-soft px-4 py-3 text-[13.5px] leading-relaxed text-accent-soft-ink">
          <Moon className="mt-0.5 size-4 shrink-0" />
          <p>Regulars (3+ errands) who haven&apos;t ordered in 10+ days. A quick friendly call often reveals a problem — or a runner taking orders off the app.</p>
        </div>
      ) : null}

      <Panel>
        {list.length === 0 ? (
          <EmptyRow>{view === "quiet" ? "Nobody has gone quiet." : "No residents found."}</EmptyRow>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-[14px]">
              <thead>
                <tr className="border-b border-line/70 text-[12px] font-semibold uppercase tracking-wider text-muted">
                  <th className="px-5 py-3">Resident</th>
                  <th className="px-3 py-3">Address</th>
                  <th className="px-3 py-3 text-right">Errands</th>
                  <th className="px-3 py-3 text-right">Spent</th>
                  <th className="px-3 py-3 text-right">Wallet</th>
                  <th className="px-3 py-3">Last errand</th>
                  <th className="px-5 py-3 text-right" />
                </tr>
              </thead>
              <motion.tbody initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.015 } } }}>
                {list.map((r) => (
                  <motion.tr key={r.id} variants={{ h: { opacity: 0 }, s: { opacity: 1 } }} className="border-b border-line/50 last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.name} size={36} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink">
                            {r.name} {!r.isActive ? <Badge tone="danger">Disabled</Badge> : null}
                          </p>
                          {r.email ? <p className="truncate text-[12.5px] text-muted">{r.email}</p> : null}
                          {r.phone ? (
                            <a href={`tel:+${r.phone}`} className="tnum inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-primary">
                              <Phone className="size-3" /> {formatPhoneLocal(r.phone)}
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-ink-2">{r.block ? `Block ${r.block}, ${r.house}` : "—"}</td>
                    <td className="tnum px-3 py-3 text-right font-medium text-ink">{r.orders}</td>
                    <td className="tnum px-3 py-3 text-right text-ink-2">{naira(r.spend)}</td>
                    <td className="tnum px-3 py-3 text-right text-ink-2">{naira(r.wallet)}</td>
                    <td className="px-3 py-3">
                      {r.lastOrderAt ? (
                        <span className="flex items-center gap-2 text-[13px] text-ink-2">
                          {timeAgo(r.lastOrderAt)}
                          {r.quiet ? (
                            <Badge tone="accent">
                              <Moon className="size-3" /> Quiet
                            </Badge>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-[13px] text-faint">Never</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setCrediting(r)}>
                          <Gift className="size-3.5" /> Credit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          onClick={() =>
                            start(async () => {
                              const res = await setResidentActive(r.id, !r.isActive);
                              if (!res.ok) return toast.error(res.error);
                              toast.success(r.isActive ? "Account disabled" : "Account enabled");
                              router.refresh();
                            })
                          }
                        >
                          {r.isActive ? <UserX className="size-3.5" /> : <UserCheck className="size-3.5" />}
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        )}
      </Panel>

      <Sheet open={!!crediting} onClose={() => setCrediting(null)} title={`Credit ${crediting?.name.split(" ")[0] ?? ""}'s wallet`} description="For goodwill, refunds after a complaint, or promotions. It lands instantly.">
        <div className="space-y-4 pt-2">
          <Field label="Amount">
            <MoneyInput value={amount} onChange={setAmount} autoFocus />
          </Field>
          <Field label="Note (they'll see this)">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Sorry about the missing bread" />
          </Field>
          <Button
            size="lg"
            block
            loading={pending}
            disabled={amount <= 0}
            onClick={() =>
              crediting &&
              start(async () => {
                const res = await creditWallet(crediting.id, amount, note);
                if (!res.ok) return toast.error(res.error);
                toast.success(`${naira(amount)} added`);
                setCrediting(null);
                setAmount(0);
                setNote("");
                router.refresh();
              })
            }
          >
            Add {amount ? naira(amount) : ""}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
