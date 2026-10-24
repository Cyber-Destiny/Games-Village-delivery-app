"use client";

import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, CircleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { Field, Input, Select } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";

export type BankValue = { bankCode: string; bankName: string; accountNumber: string; accountName: string | null };

/**
 * Bank picker + 10-digit account number, verified live against Paystack. On
 * Paystack accounts that can't look names up (Starter), the name is typed in.
 */
export function BankFields({ value, onChange }: { value: BankValue; onChange: (v: BankValue) => void }) {
  const { data } = useSWR<{ banks: Array<{ name: string; code: string }>; typeName?: boolean }>("/api/banks", { revalidateOnFocus: false });
  const typeName = !!data?.typeName;
  const [state, setState] = useState<"idle" | "checking" | "ok" | "error">(value.accountName ? "ok" : "idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeName || !data) return;
    if (!/^\d{10}$/.test(value.accountNumber) || !value.bankCode) {
      setState("idle");
      return;
    }
    if (value.accountName) return;
    let cancelled = false;
    setState("checking");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/banks/resolve?account=${value.accountNumber}&bank=${encodeURIComponent(value.bankCode)}`);
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error);
        setState("ok");
        setError(null);
        onChange({ ...value, accountName: json.accountName });
      } catch (err) {
        if (cancelled) return;
        setState("error");
        setError(err instanceof Error ? err.message : "Couldn't verify");
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.accountNumber, value.bankCode, typeName, !!data]);

  return (
    <div className="space-y-3">
      <Field label="Bank">
        <Select
          value={value.bankCode}
          onChange={(e) => {
            const bank = data?.banks.find((b) => b.code === e.target.value);
            onChange({ ...value, bankCode: e.target.value, bankName: bank?.name ?? "", accountName: null });
          }}
        >
          <option value="">{data ? "Choose bank" : "Loading banks…"}</option>
          {data?.banks.map((b) => (
            <option key={b.code + b.name} value={b.code}>
              {b.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Account number">
        <Input
          inputMode="numeric"
          placeholder="10 digits"
          maxLength={10}
          value={value.accountNumber}
          onChange={(e) => onChange({ ...value, accountNumber: e.target.value.replace(/\D/g, "").slice(0, 10), accountName: typeName ? value.accountName : null })}
          className="tnum tracking-wider"
        />
      </Field>
      {typeName ? (
        <Field label="Account name" hint="Exactly as the bank shows it. Double-check it before saving.">
          <Input
            value={value.accountName ?? ""}
            onChange={(e) => onChange({ ...value, accountName: e.target.value.trim() ? e.target.value : null })}
            placeholder="e.g. ADAEZE OKAFOR"
            autoCapitalize="characters"
          />
        </Field>
      ) : null}
      <AnimatePresence mode="wait" initial={false}>
        {typeName ? null : state === "checking" ? (
          <motion.p key="c" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 px-1 text-[13.5px] text-muted">
            <Spinner className="size-4" /> Checking account…
          </motion.p>
        ) : state === "ok" && value.accountName ? (
          <motion.p
            key="ok"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 rounded-xl bg-primary-soft px-3 py-2.5 text-[14px] font-semibold text-primary-soft-ink"
          >
            <BadgeCheck className="size-4" /> {value.accountName}
          </motion.p>
        ) : state === "error" ? (
          <motion.p key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 px-1 text-[13.5px] font-medium text-danger">
            <CircleAlert className="size-4" /> {error}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export const emptyBank: BankValue = { bankCode: "", bankName: "", accountNumber: "", accountName: null };
