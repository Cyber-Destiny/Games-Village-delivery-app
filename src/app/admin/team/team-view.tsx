"use client";

import { BellOff, BellRing, Headset, Plus, ShieldCheck, UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminHeader, EmptyRow, Panel } from "@/components/admin/ui";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import type { Team } from "@/lib/admin";
import { addSupportAgent, removeSupportAgent } from "../actions";

type Agent = Team["agents"][number];

function Alerts({ on }: { on: boolean }) {
  return on ? (
    <Badge tone="success">
      <BellRing className="size-3" /> Alerts on
    </Badge>
  ) : (
    <Badge>
      <BellOff className="size-3" /> Alerts off
    </Badge>
  );
}

export function TeamView({ team }: { team: Team }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [removing, setRemoving] = useState<Agent | null>(null);
  const [pending, start] = useTransition();

  const add = () =>
    start(async () => {
      const res = await addSupportAgent({ name, email });
      if (!res.ok) return toast.error(res.error);
      toast.success(`${name.split(" ")[0]} can now sign in with ${email.trim().toLowerCase()}`);
      setAdding(false);
      setName("");
      setEmail("");
      router.refresh();
    });

  const remove = (a: Agent) =>
    start(async () => {
      const res = await removeSupportAgent(a.id);
      if (!res.ok) return toast.error(res.error);
      toast.success(`${(a.name ?? "They").split(" ")[0]} no longer has support access`);
      setRemoving(null);
      router.refresh();
    });

  return (
    <>
      <AdminHeader
        title="Team"
        description="Admins and the support agents who answer customers."
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Add support agent
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title={`Support agents · ${team.agents.length}`}>
          {team.agents.length ? (
            <ul className="divide-y divide-line/70">
              {team.agents.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <Avatar name={a.name ?? a.email ?? "?"} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-ink">{a.name}</p>
                    <p className="truncate text-[13px] text-muted">{a.email}</p>
                  </div>
                  <Alerts on={a.alerts} />
                  <Button size="sm" variant="ghost" onClick={() => setRemoving(a)}>
                    <UserMinus className="size-3.5" /> Remove
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyRow>No support agents yet. Add someone to answer support chats and handle errands.</EmptyRow>
          )}
          <div className="flex gap-3 border-t border-line/70 bg-surface-2 px-5 py-4 text-[13px] leading-relaxed text-muted">
            <Headset className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>
              Support agents sign in at <span className="font-medium text-ink-2">runam.app/login</span> with their email and see only Errands and Support. They can
              reply to customers, chat on errands, reassign, cancel with a wallet refund and mark delivered. They can&apos;t see payouts, residents, runners, shops,
              the team or settings.
            </p>
          </div>
        </Panel>

        <Panel title={`Admins · ${team.admins.length}`}>
          <ul className="divide-y divide-line/70">
            {team.admins.map((a) => (
              <li key={a.email} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <Avatar name={a.name ?? a.email} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-ink">{a.name ?? "Hasn't signed in yet"}</p>
                  <p className="truncate text-[13px] text-muted">{a.email}</p>
                </div>
                {a.signedIn ? <Alerts on={a.alerts} /> : null}
              </li>
            ))}
          </ul>
          <div className="flex gap-3 border-t border-line/70 bg-surface-2 px-5 py-4 text-[13px] leading-relaxed text-muted">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>
              Admins are set in Vercel, under the <span className="font-medium text-ink-2">ADMIN_EMAILS</span> setting, then redeployed. Taking an email off
              that list signs the person out straight away.
            </p>
          </div>
        </Panel>
      </div>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add a support agent" description="They sign in with this email. We email them a code each time.">
        <div className="space-y-4 pt-1">
          <Field label="Full name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ngozi Eze" autoComplete="off" />
          </Field>
          <Field label="Email" hint="How they sign in">
            <Input type="email" inputMode="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="off" />
          </Field>
          <Button size="lg" className="w-full" loading={pending} disabled={name.trim().length < 2 || !email.includes("@")} onClick={add}>
            Add support agent
          </Button>
        </div>
      </Sheet>

      <Sheet open={!!removing} onClose={() => setRemoving(null)} title={`Remove ${removing?.name ?? "this agent"}?`}>
        {removing ? (
          <div className="space-y-5 pt-1">
            <p className="text-[14.5px] leading-relaxed text-ink-2">
              They&apos;re signed out straight away and lose access to Errands and Support. Their email becomes an ordinary resident account.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setRemoving(null)}>
                Keep
              </Button>
              <Button variant="danger" className="flex-1" loading={pending} onClick={() => remove(removing)}>
                Remove
              </Button>
            </div>
          </div>
        ) : null}
      </Sheet>
    </>
  );
}
