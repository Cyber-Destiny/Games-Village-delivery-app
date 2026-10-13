"use client";

import { motion } from "motion/react";
import { BellRing, Check, Copy, CreditCard, MessageSquareText, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { CategoryBadge } from "@/components/brand/category-art";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { CATEGORIES } from "@/lib/categories";
import { naira } from "@/lib/money";
import type { Settings } from "@/lib/settings-shared";
import { saveSettings } from "../actions";

type Status = { paystack: "demo" | "test" | "live"; sms: boolean; push: boolean; webhook: string; callback: string };

export function SettingsView({ initial, status }: { initial: Settings; status: Status }) {
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [phone, setPhone] = useState(initial.supportPhone ? "0" + initial.supportPhone.replace(/^234/, "") : "");
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(s) !== JSON.stringify(initial);
  const num = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: Number(e.target.value.replace(/\D/g, "")) || 0 });
  const exampleFee = s.fees.groceries;

  return (
    <>
      <AdminHeader
        title="Settings"
        description="Fees, commission, opening hours and integrations."
        actions={
          <Button
            loading={pending}
            disabled={!dirty}
            onClick={() =>
              start(async () => {
                const res = await saveSettings(s);
                if (!res.ok) return toast.error(res.error);
                toast.success("Settings saved");
                router.refresh();
              })
            }
          >
            <Save className="size-4" /> Save changes
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Service fees" bodyClass="divide-y divide-line/70">
          {CATEGORIES.map((c) => (
            <div key={c.id} className="flex items-center gap-4 px-5 py-3">
              <CategoryBadge id={c.id} size={40} />
              <p className="flex-1 font-medium text-ink">{c.label}</p>
              <div className="w-40">
                <MoneyInput value={s.fees[c.id]} onChange={(v) => setS({ ...s, fees: { ...s.fees, [c.id]: v } })} />
              </div>
            </div>
          ))}
        </Panel>

        <div className="space-y-6">
          <Panel title="Runners" bodyClass="space-y-4 p-5">
            <Field label="Runner's share of the service fee" hint={`On a ${naira(exampleFee)} fee the runner earns ${naira(Math.round((exampleFee * s.runnerCommissionPct) / 100))}.`}>
              <Input value={String(s.runnerCommissionPct)} onChange={num("runnerCommissionPct")} inputMode="numeric" trailing={<span className="pr-1 text-muted">%</span>} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Weekly bonus target" hint="Errands per week">
                <Input value={String(s.weeklyBonusTarget)} onChange={num("weeklyBonusTarget")} inputMode="numeric" />
              </Field>
              <Field label="Bonus amount">
                <MoneyInput value={s.weeklyBonusAmount} onChange={(v) => setS({ ...s, weeklyBonusAmount: v })} />
              </Field>
            </div>
            <Row label="Pay partner shops automatically" sub="Turn off to approve every shop transfer yourself" checked={s.autoPayPartnerVendors} onChange={(v) => setS({ ...s, autoPayPartnerVendors: v })} />
          </Panel>

          <Panel title="Residents" bodyClass="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Free fee every" hint="0 turns loyalty off">
                <Input value={String(s.loyaltyEvery)} onChange={num("loyaltyEvery")} inputMode="numeric" trailing={<span className="pr-1 text-[13px] text-muted">errands</span>} />
              </Field>
              <Field label="Max budget per errand">
                <MoneyInput value={s.maxBudget} onChange={(v) => setS({ ...s, maxBudget: v })} />
              </Field>
            </div>
            <Field label="Announcement banner" optional hint="Shown on everyone's home screen">
              <Textarea rows={2} value={s.announcement} onChange={(e) => setS({ ...s, announcement: e.target.value })} placeholder="e.g. Suya Junction is now a partner shop!" />
            </Field>
            <Field label="Support phone" optional hint="Residents can call this from their account page">
              <Input
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setS({ ...s, supportPhone: e.target.value });
                }}
                inputMode="tel"
                placeholder="0803 123 4567"
              />
            </Field>
          </Panel>
        </div>

        <Panel title="Opening hours" bodyClass="space-y-4 p-5">
          <Row label="Accepting errands" sub="Switch off to pause the service right away" checked={s.serviceOpen} onChange={(v) => setS({ ...s, serviceOpen: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Opens">
              <Input type="time" value={s.openTime} onChange={(e) => setS({ ...s, openTime: e.target.value })} />
            </Field>
            <Field label="Closes">
              <Input type="time" value={s.closeTime} onChange={(e) => setS({ ...s, closeTime: e.target.value })} />
            </Field>
          </div>
        </Panel>

        <Panel title="Integrations" bodyClass="divide-y divide-line/70">
          <Integration
            icon={<CreditCard className="size-5" />}
            name="Paystack"
            state={status.paystack === "live" ? "Live" : status.paystack === "test" ? "Test mode" : "Demo mode"}
            ok={status.paystack === "live"}
            detail={status.paystack === "demo" ? "Add PAYSTACK_SECRET_KEY to take real payments." : "Paste these into Paystack → Settings → API Keys & Webhooks."}
          >
            {status.paystack !== "demo" ? (
              <div className="mt-3 space-y-2">
                <CopyLine label="Webhook URL" value={status.webhook} />
                <CopyLine label="Callback URL" value={status.callback} />
              </div>
            ) : null}
          </Integration>
          <Integration icon={<MessageSquareText className="size-5" />} name="SMS (Termii)" state={status.sms ? "Connected" : "Not set up"} ok={status.sms} detail={status.sms ? "Login codes and key alerts are sent by SMS." : "Add TERMII_API_KEY and set SMS_PROVIDER=termii so login codes are texted."} />
          <Integration icon={<BellRing className="size-5" />} name="Push notifications" state={status.push ? "Connected" : "Not set up"} ok={status.push} detail={status.push ? "Runners and residents can turn on alerts in their profile." : "Generate VAPID keys (npx web-push generate-vapid-keys) and add them to the environment."} />
        </Panel>
      </div>

      {dirty ? (
        <motion.div initial={{ y: 80 }} animate={{ y: 0 }} className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-fit items-center gap-3 rounded-2xl bg-ink py-2 pl-5 pr-2 text-bg shadow-[var(--shadow-pop)]">
          <span className="text-[14px]">You have unsaved changes</span>
          <Button size="sm" variant="ghost" className="text-bg/70 hover:bg-white/10 hover:text-bg" onClick={() => {
              setS(initial);
              setPhone(initial.supportPhone ? "0" + initial.supportPhone.replace(/^234/, "") : "");
            }}>
            Reset
          </Button>
          <Button
            size="sm"
            loading={pending}
            onClick={() =>
              start(async () => {
                const res = await saveSettings(s);
                if (!res.ok) return toast.error(res.error);
                toast.success("Settings saved");
                router.refresh();
              })
            }
          >
            Save
          </Button>
        </motion.div>
      ) : null}
    </>
  );
}

function Row({ label, sub, checked, onChange }: { label: string; sub: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-line px-4 py-3">
      <div>
        <p className="text-[14.5px] font-semibold text-ink">{label}</p>
        <p className="text-[12.5px] text-muted">{sub}</p>
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

function Integration({ icon, name, state, ok, detail, children }: { icon: React.ReactNode; name: string; state: string; ok: boolean; detail: string; children?: React.ReactNode }) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-sunken text-ink-2">{icon}</span>
        <p className="flex-1 font-semibold text-ink">{name}</p>
        <Badge tone={ok ? "success" : "accent"} dot>
          {state}
        </Badge>
      </div>
      <p className="mt-2 pl-[52px] text-[13px] text-muted">{detail}</p>
      <div className="pl-[52px]">{children}</div>
    </div>
  );
}

function CopyLine({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(value).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="flex w-full items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-left"
    >
      <span className="w-24 shrink-0 text-[12px] font-medium text-muted">{label}</span>
      <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-ink">{value}</span>
      {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4 text-muted" />}
    </button>
  );
}
