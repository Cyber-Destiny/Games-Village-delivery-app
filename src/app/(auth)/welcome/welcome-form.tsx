"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { completeProfile } from "../actions";

const ease = [0.22, 1, 0.36, 1] as const;

export function WelcomeForm({
  isResident,
  initial,
}: {
  isResident: boolean;
  initial: { name: string; block: string; house: string; street: string; landmark: string };
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  return (
    <motion.form
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await completeProfile(v);
          if (!res.ok) return setError(res.error);
          router.replace(res.data.redirect);
        });
      }}
      className="space-y-5"
    >
      <div>
        <h1 className="font-display text-[32px] font-bold leading-tight text-ink">Welcome aboard</h1>
        <p className="mt-2 text-[15.5px] text-muted">
          {isResident ? "Tell us who you are and where to bring your errands." : "What should we call you?"}
        </p>
      </div>

      <Field label="Your name">
        <Input autoFocus placeholder="e.g. Amaka Obi" value={v.name} onChange={set("name")} autoComplete="name" />
      </Field>

      {isResident ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Block">
              <Input placeholder="e.g. C" value={v.block} onChange={set("block")} />
            </Field>
            <Field label="House / Flat">
              <Input placeholder="e.g. 14" value={v.house} onChange={set("house")} />
            </Field>
          </div>
          <Field label="Street" optional>
            <Input placeholder="e.g. Hockey Close" value={v.street} onChange={set("street")} />
          </Field>
          <Field label="Landmark" optional hint="Helps your runner find you fast.">
            <Input placeholder="e.g. Blue gate opposite the playground" value={v.landmark} onChange={set("landmark")} />
          </Field>
        </>
      ) : null}

      {error ? <p className="text-[13px] font-medium text-danger">{error}</p> : null}

      <Button type="submit" size="xl" block loading={pending} disabled={!v.name.trim()}>
        Continue <ArrowRight className="size-5" />
      </Button>
    </motion.form>
  );
}
