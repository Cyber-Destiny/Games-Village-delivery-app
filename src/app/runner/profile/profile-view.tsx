"use client";

import { Landmark, LogOut, Pencil, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BankFields, emptyBank, type BankValue } from "@/components/app/bank-form";
import { PushToggle } from "@/components/app/push";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { formatPhoneLocal } from "@/lib/phone";
import { signOut } from "../../(auth)/actions";
import { saveBank } from "../actions";

export function ProfileView({
  name,
  phone,
  tag,
  bank,
  rating,
  ratingCount,
}: {
  name: string;
  phone: string;
  tag: string | null;
  bank: { bankName: string; accountNumber: string; accountName: string } | null;
  rating: number | null;
  ratingCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<BankValue>(emptyBank);
  const [pending, start] = useTransition();

  return (
    <main className="safe-top px-5 pb-36 pt-4">
      <section className="flex flex-col items-center pt-4 text-center">
        <Avatar name={name} size={84} />
        <h1 className="mt-4 font-display text-[26px] font-bold text-ink">{name}</h1>
        <p className="tnum text-[14px] text-muted">{formatPhoneLocal(phone)}</p>
        <div className="mt-4 flex gap-2">
          {tag ? <span className="rounded-full bg-hero px-3 py-1.5 text-[12.5px] font-semibold text-hero-ink">Bag {tag}</span> : null}
          <span className="inline-flex items-center gap-1 rounded-full bg-sunken px-3 py-1.5 text-[12.5px] font-semibold text-ink-2">
            <Star className="size-3.5 fill-accent text-accent" /> {rating ? rating.toFixed(1) : "New"} · {ratingCount} ratings
          </span>
        </div>
      </section>

      <section className="mt-7 overflow-hidden rounded-[22px] border border-line/70 bg-surface shadow-[var(--shadow-card)]">
        <button onClick={() => setOpen(true)} className="flex w-full items-center gap-3.5 px-4 py-4 text-left hover:bg-surface-2">
          <span className="grid size-10 place-items-center rounded-xl bg-sunken text-ink-2">
            <Landmark className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-ink">Payout account</span>
            <span className="block truncate text-[12.5px] text-muted">{bank ? `${bank.accountName} · ${bank.bankName} ••••${bank.accountNumber.slice(-4)}` : "Add where we send your earnings"}</span>
          </span>
          <Pencil className="size-4 text-faint" />
        </button>
        <div className="border-t border-line">
          <PushToggle description="Get alerted the second an errand comes in" />
        </div>
      </section>

      <form action={signOut} className="mt-6">
        <Button type="submit" variant="ghost" block className="text-danger hover:text-danger">
          <LogOut className="size-[18px]" /> Sign out
        </Button>
      </form>

      <Sheet open={open} onClose={() => setOpen(false)} title="Payout account" description="Must be in your own name.">
        <div className="space-y-4 pt-2">
          <BankFields value={value} onChange={setValue} />
          <Button
            size="lg"
            block
            loading={pending}
            disabled={!value.accountName}
            onClick={() =>
              start(async () => {
                const res = await saveBank({ bankCode: value.bankCode, bankName: value.bankName, accountNumber: value.accountNumber });
                if (!res.ok) return toast.error(res.error);
                toast.success("Payout account saved");
                setOpen(false);
                router.refresh();
              })
            }
          >
            Save account
          </Button>
        </div>
      </Sheet>
    </main>
  );
}
