"use client";

import { motion } from "motion/react";
import { Banknote, Pencil, Plus, ShieldCheck, Star, UserX, UserCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BankFields, emptyBank, type BankValue } from "@/components/app/bank-form";
import { AdminHeader } from "@/components/admin/ui";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import type { AdminRunner } from "@/lib/admin";
import { cn } from "@/lib/cn";
import { naira } from "@/lib/money";
import { formatPhoneLocal } from "@/lib/phone";
import { timeAgo } from "@/lib/time";
import { payRunnerNow, saveRunner, setRunnerActive } from "../actions";

type Form = { id: string | null; name: string; phone: string; tag: string; nin: string; guarantorName: string; guarantorPhone: string };
const blank: Form = { id: null, name: "", phone: "", tag: "", nin: "", guarantorName: "", guarantorPhone: "" };

export function RunnersView({ runners }: { runners: AdminRunner[] }) {
  const router = useRouter();
  const [form, setForm] = useState<Form | null>(null);
  const [bank, setBank] = useState<BankValue>(emptyBank);
  const [pending, start] = useTransition();
  const online = runners.filter((r) => r.online).length;

  const open = (r?: AdminRunner) => {
    setBank(emptyBank);
    setForm(
      r
        ? {
            id: r.id,
            name: r.name,
            phone: "0" + r.phone.slice(3),
            tag: r.tag ?? "",
            nin: r.nin ?? "",
            guarantorName: r.guarantorName ?? "",
            guarantorPhone: r.guarantorPhone ? "0" + r.guarantorPhone.replace(/^234/, "") : "",
          }
        : blank,
    );
  };
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => (f ? { ...f, [k]: e.target.value } : f));
  const current = form?.id ? runners.find((r) => r.id === form.id) : null;

  return (
    <>
      <AdminHeader
        title="Runners"
        description={`${online} online · ${runners.filter((r) => r.isActive).length} active`}
        actions={
          <Button onClick={() => open()}>
            <Plus className="size-4" /> Add runner
          </Button>
        }
      />

      <motion.div initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.04 } } }} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {runners.map((r) => (
          <motion.div key={r.id} variants={{ h: { opacity: 0, y: 12 }, s: { opacity: 1, y: 0 } }} className={cn("card flex flex-col p-5", !r.isActive && "opacity-60")}>
            <div className="flex items-start gap-3">
              <div className="relative">
                <Avatar name={r.name} size={48} />
                <span className={cn("absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full ring-[3px] ring-surface", r.online ? "bg-primary" : "bg-line-strong")} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[17px] font-semibold text-ink">{r.name}</p>
                <p className="tnum text-[13px] text-muted">{formatPhoneLocal(r.phone)}</p>
              </div>
              {r.tag ? <span className="rounded-lg bg-hero px-2 py-1 text-[11.5px] font-semibold text-hero-ink">{r.tag}</span> : null}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {!r.isActive ? <Badge tone="danger">Suspended</Badge> : r.online ? <Badge tone="success" dot pulse>Online</Badge> : <Badge>Offline{r.lastSeen ? ` · ${timeAgo(r.lastSeen)}` : ""}</Badge>}
              {r.job ? (
                <Link href={`/admin/orders/${r.job.id}`}>
                  <StatusBadge status={r.job.status} />
                </Link>
              ) : null}
              {r.nin && r.guarantorName ? (
                <span className="inline-flex items-center gap-1 text-[12px] font-medium text-primary">
                  <ShieldCheck className="size-3.5" /> Vetted
                </span>
              ) : (
                <span className="text-[12px] font-medium text-accent-soft-ink">Missing NIN / guarantor</span>
              )}
            </div>

            <dl className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-surface-2 p-3 text-center">
              <div>
                <dt className="text-[11px] text-muted">Rating</dt>
                <dd className="mt-0.5 flex items-center justify-center gap-1 text-[15px] font-semibold text-ink">
                  <Star className="size-3.5 fill-accent text-accent" />
                  {r.rating ? r.rating.toFixed(1) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-muted">This week</dt>
                <dd className="mt-0.5 text-[15px] font-semibold text-ink">{r.weekJobs}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-muted">Unpaid</dt>
                <dd className="tnum mt-0.5 text-[15px] font-semibold text-ink">{naira(r.unpaid)}</dd>
              </div>
            </dl>

            <p className="mt-3 truncate text-[12.5px] text-muted">
              {r.bank ? `Pays to ${r.bank.accountName} · ${r.bank.bankName}` : "No payout account yet"}
            </p>

            <div className="mt-4 flex gap-2 pt-1">
              <Button size="sm" variant="secondary" onClick={() => open(r)}>
                <Pencil className="size-3.5" /> Edit
              </Button>
              <Button
                size="sm"
                variant="soft"
                disabled={!r.unpaid || !r.bank || pending}
                onClick={() =>
                  start(async () => {
                    const res = await payRunnerNow(r.id);
                    if (!res.ok) return toast.error(res.error);
                    toast.success(`Sending ${naira(res.data.amount)} to ${r.name.split(" ")[0]}`);
                    router.refresh();
                  })
                }
              >
                <Banknote className="size-3.5" /> Pay {r.unpaid ? naira(r.unpaid) : ""}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await setRunnerActive(r.id, !r.isActive);
                    if (!res.ok) return toast.error(res.error);
                    toast.success(r.isActive ? "Runner suspended and signed out" : "Runner reactivated");
                    router.refresh();
                  })
                }
              >
                {r.isActive ? <UserX className="size-3.5" /> : <UserCheck className="size-3.5" />}
                {r.isActive ? "Suspend" : "Activate"}
              </Button>
            </div>
          </motion.div>
        ))}
        {runners.length === 0 ? <div className="card col-span-full p-10 text-center text-muted">No runners yet. Add your first one.</div> : null}
      </motion.div>

      <Sheet open={!!form} onClose={() => setForm(null)} title={form?.id ? "Edit runner" : "Add a runner"} description="They sign in with this phone number." wide>
        {form ? (
          <div className="grid gap-4 pt-2 sm:grid-cols-2">
            <Field label="Full name">
              <Input value={form.name} onChange={set("name")} placeholder="e.g. Adaeze Okafor" />
            </Field>
            <Field label="Phone number">
              <Input value={form.phone} onChange={set("phone")} inputMode="tel" placeholder="0803 123 4567" />
            </Field>
            <Field label="Bag / vest number" optional>
              <Input value={form.tag} onChange={set("tag")} placeholder="e.g. RN-04" />
            </Field>
            <Field label="NIN" hint="11 digits — keep a copy of their slip">
              <Input value={form.nin} onChange={set("nin")} inputMode="numeric" maxLength={11} />
            </Field>
            <Field label="Guarantor name">
              <Input value={form.guarantorName} onChange={set("guarantorName")} />
            </Field>
            <Field label="Guarantor phone">
              <Input value={form.guarantorPhone} onChange={set("guarantorPhone")} inputMode="tel" />
            </Field>
            <div className="rounded-2xl bg-surface-2 p-4 sm:col-span-2">
              <p className="mb-1 text-[14px] font-semibold text-ink">Payout account</p>
              <p className="mb-3 text-[12.5px] text-muted">{current?.bank ? `Currently ${current.bank.accountName} · ${current.bank.bankName}. Fill in to change.` : "Where their earnings are sent."}</p>
              <BankFields value={bank} onChange={setBank} />
            </div>
            <Button
              size="lg"
              className="sm:col-span-2"
              loading={pending}
              disabled={!!bank.accountNumber && !bank.accountName}
              onClick={() =>
                start(async () => {
                  const res = await saveRunner({ ...form, bank: bank.accountName ? { bankCode: bank.bankCode, bankName: bank.bankName, accountNumber: bank.accountNumber } : null });
                  if (!res.ok) return toast.error(res.error);
                  toast.success(form.id ? "Runner updated" : "Runner added", form.id ? undefined : "They can sign in with their phone number now.");
                  setForm(null);
                  router.refresh();
                })
              }
            >
              {form.id ? "Save changes" : "Add runner"}
            </Button>
          </div>
        ) : null}
      </Sheet>
    </>
  );
}
