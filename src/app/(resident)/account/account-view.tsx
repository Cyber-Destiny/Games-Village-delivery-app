"use client";

import { motion } from "motion/react";
import { ChevronRight, CircleHelp, FileText, Lock, LogOut, MapPin, ShieldCheck, UserRound } from "lucide-react";
import { OffPlatformNote } from "@/components/legal/notes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PushToggle } from "@/components/app/push";
import { SupportCard } from "@/components/support/support-card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { APP_NAME } from "@/lib/brand";
import { formatPhoneLocal } from "@/lib/phone";
import { signOut } from "../../(auth)/actions";
import { saveProfile } from "../actions";

type Profile = { name: string; email: string; phone: string; block: string; house: string; street: string; landmark: string };

export function AccountView({
  profile,
  supportPhone,
  supportUnread,
  delivered,
  isAdmin,
}: {
  profile: Profile;
  supportPhone: string;
  supportUnread: number;
  delivered: number;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(profile);
  const [pending, start] = useTransition();
  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  return (
    <main className="safe-top px-5 pb-36 pt-4">
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center pt-4 text-center">
        <Avatar name={profile.name} size={84} />
        <h1 className="mt-4 font-display text-[26px] font-bold text-ink">{profile.name}</h1>
        <p className="tnum text-[14px] text-muted">{formatPhoneLocal(profile.phone)}</p>
        <div className="mt-4 flex gap-2">
          <span className="rounded-full bg-primary-soft px-3 py-1.5 text-[12.5px] font-semibold text-primary-soft-ink">
            {delivered} errand{delivered === 1 ? "" : "s"} done
          </span>
          <span className="rounded-full bg-sunken px-3 py-1.5 text-[12.5px] font-semibold text-ink-2">
            Block {profile.block}, House {profile.house}
          </span>
        </div>
      </motion.section>

      {isAdmin ? (
        <Link href="/admin" className="mt-6 flex items-center justify-between rounded-[22px] bg-hero px-5 py-4 text-hero-ink">
          <span className="font-semibold">Open admin console</span>
          <ChevronRight className="size-5" />
        </Link>
      ) : null}

      <section className="mt-6 divide-y divide-line overflow-hidden rounded-[22px] border border-line/70 bg-surface shadow-[var(--shadow-card)]">
        <Row icon={<UserRound className="size-5" />} label="Personal details" sub="Name and email for receipts" onClick={() => setEdit(true)} />
        <Row icon={<MapPin className="size-5" />} label="Delivery address" sub={[`Block ${profile.block}, House ${profile.house}`, profile.street].filter(Boolean).join(" · ")} onClick={() => setEdit(true)} />
        <PushToggle description="Know when your runner is on the way" />
      </section>

      {isAdmin ? null : <SupportCard phone={supportPhone} unread={supportUnread} className="mt-4" />}

      <section className="mt-4 divide-y divide-line overflow-hidden rounded-[22px] border border-line/70 bg-surface shadow-[var(--shadow-card)]">
        <Row icon={<CircleHelp className="size-5" />} label="How it works" sub="Fees, refunds, delivery codes" href="/#how" />
        <Row icon={<ShieldCheck className="size-5" />} label={`The ${APP_NAME} promise`} sub="Pay in the app, you're covered" href="/#how" />
        <Row icon={<FileText className="size-5" />} label="Terms of Service" sub="Including dealings outside the app" href="/terms" />
        <Row icon={<Lock className="size-5" />} label="Privacy Policy" sub="What we collect and why" href="/privacy" />
      </section>
      <OffPlatformNote className="mt-4 px-1" />

      <form action={signOut} className="mt-6">
        <Button type="submit" variant="ghost" block className="text-danger hover:text-danger">
          <LogOut className="size-[18px]" /> Sign out
        </Button>
      </form>

      <Sheet open={edit} onClose={() => setEdit(false)} title="Your details">
        <div className="space-y-4 pt-2">
          <Field label="Name">
            <Input value={v.name} onChange={set("name")} />
          </Field>
          <Field label="Email" optional hint="For Paystack payment receipts">
            <Input type="email" inputMode="email" value={v.email} onChange={set("email")} placeholder="you@example.com" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Block">
              <Input value={v.block} onChange={set("block")} />
            </Field>
            <Field label="House / Flat">
              <Input value={v.house} onChange={set("house")} />
            </Field>
          </div>
          <Field label="Street" optional>
            <Input value={v.street} onChange={set("street")} />
          </Field>
          <Field label="Landmark" optional>
            <Input value={v.landmark} onChange={set("landmark")} />
          </Field>
          <Button
            size="lg"
            block
            loading={pending}
            onClick={() =>
              start(async () => {
                const res = await saveProfile({ name: v.name, email: v.email, block: v.block, house: v.house, street: v.street, landmark: v.landmark });
                if (!res.ok) return toast.error(res.error);
                toast.success("Saved");
                setEdit(false);
                router.refresh();
              })
            }
          >
            Save
          </Button>
        </div>
      </Sheet>
    </main>
  );
}

function Row({ icon, label, sub, onClick, href }: { icon: React.ReactNode; label: string; sub?: string; onClick?: () => void; href?: string }) {
  const inner = (
    <>
      <span className="grid size-10 place-items-center rounded-xl bg-sunken text-ink-2">{icon}</span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[15px] font-semibold text-ink">{label}</span>
        {sub ? <span className="block truncate text-[12.5px] text-muted">{sub}</span> : null}
      </span>
      <ChevronRight className="size-4 shrink-0 text-faint" />
    </>
  );
  const cls = "flex w-full items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-surface-2";
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}
