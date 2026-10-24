"use client";

import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, Camera, Flame, MapPin, MessageCircle, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { BankFields, emptyBank, type BankValue } from "@/components/app/bank-form";
import { AdminHeader } from "@/components/admin/ui";
import { categoryPhoto, Photo, shopPhoto } from "@/components/brand/photo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import type { AdminVendor } from "@/lib/admin";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { naira } from "@/lib/money";
import { uploadPhoto } from "@/lib/upload-client";
import { deleteItem, saveItem, saveVendor } from "../actions";

type Details = {
  id: string | null;
  name: string;
  category: string;
  description: string;
  location: string;
  contacts: ContactRow[];
  image: string | null;
  hours: string;
  isPartner: boolean;
  isActive: boolean;
};

type ContactRow = { key: number; label: string; email: string };

let contactKey = 0;
const contactRow = (label = "", email = ""): ContactRow => ({ key: ++contactKey, label, email });

const blank = (): Details => ({
  id: null,
  name: "",
  category: "food",
  description: "",
  location: "",
  contacts: [contactRow()],
  image: null,
  hours: "",
  isPartner: true,
  isActive: true,
});

export function VendorsView({ vendors }: { vendors: AdminVendor[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Details | null>(null);
  const [tab, setTab] = useState<"details" | "items">("details");
  const [bank, setBank] = useState<BankValue>(emptyBank);
  const [pending, start] = useTransition();
  const current = editing?.id ? vendors.find((v) => v.id === editing.id) : null;

  const open = (v?: AdminVendor) => {
    setBank(emptyBank);
    setTab("details");
    setEditing(
      v
        ? {
            id: v.id,
            name: v.name,
            category: v.category,
            description: v.description ?? "",
            location: v.location ?? "",
            contacts: v.contacts.length
              ? v.contacts.map((c) => contactRow(c.label ?? "", c.email))
              : [contactRow()],
            image: v.image,
            hours: v.hours ?? "",
            isPartner: v.isPartner,
            isActive: v.isActive,
          }
        : blank(),
    );
  };
  const set = (k: keyof Details) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setEditing((d) => (d ? { ...d, [k]: e.target.value } : d));

  return (
    <>
      <AdminHeader
        title="Shops"
        description="Partner shops get paid automatically when a runner confirms a purchase."
        actions={
          <Button onClick={() => open()}>
            <Plus className="size-4" /> Add shop
          </Button>
        }
      />

      <motion.div initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.04 } } }} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {vendors.map((v) => {
          return (
            <motion.button
              key={v.id}
              variants={{ h: { opacity: 0, y: 12 }, s: { opacity: 1, y: 0 } }}
              whileHover={{ y: -3 }}
              initial="rest"
              onClick={() => open(v)}
              className={cn("card overflow-hidden text-left", !v.isActive && "opacity-55")}
            >
              <div className="relative flex h-32 items-start justify-end bg-sunken p-3">
                <Photo src={shopPhoto(v)} sizes="(min-width: 1280px) 400px, (min-width: 640px) 50vw, 100vw" />
                <div className="relative flex gap-1.5">
                  {!v.isActive ? <Badge tone="danger">Hidden</Badge> : null}
                  {v.isPartner && v.accountNumber ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface/90 px-2 py-1 text-[11px] font-semibold text-primary-soft-ink backdrop-blur">
                      <BadgeCheck className="size-3" /> Partner
                    </span>
                  ) : (
                    <span className="rounded-full bg-surface/90 px-2 py-1 text-[11px] font-semibold text-accent-soft-ink backdrop-blur">No bank yet</span>
                  )}
                </div>
              </div>
              <div className="p-5">
                <p className="truncate font-display text-[17px] font-semibold text-ink">{v.name}</p>
                <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-muted">
                  <MapPin className="size-3.5 shrink-0" /> {v.location || getCategory(v.category).label}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <Mini label="Items" value={String(v.items.length)} />
                  <Mini label="Errands · 30d" value={String(v.orders30)} />
                  <Mini label="Paid · 30d" value={naira(v.spend30)} />
                </div>
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? editing.name || "Edit shop" : "Add a shop"} wide>
        {editing ? (
          <div className="pt-1">
            {editing.id ? (
              <Segmented
                className="mb-5 w-full"
                value={tab}
                onChange={setTab}
                options={[
                  { value: "details", label: "Details" },
                  { value: "items", label: "Items", count: current?.items.length },
                ]}
              />
            ) : null}
            <AnimatePresence mode="wait">
              {tab === "details" ? (
                <motion.div key="d" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="grid gap-4 sm:grid-cols-2">
                  <Field label="Shop name">
                    <Input value={editing.name} onChange={set("name")} />
                  </Field>
                  <Field label="Category">
                    <Select value={editing.category} onChange={set("category")}>
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Where in the estate" optional>
                    <Input value={editing.location} onChange={set("location")} placeholder="e.g. Estate market, shop 4" />
                  </Field>
                  <Field label="Opening hours" optional>
                    <Input value={editing.hours} onChange={set("hours")} placeholder="e.g. 8am – 9pm" />
                  </Field>
                  <Field label="Short description" optional>
                    <Input value={editing.description} onChange={set("description")} />
                  </Field>
                  <CoverEditor
                    category={editing.category}
                    image={editing.image}
                    onChange={(image) => setEditing({ ...editing, image })}
                  />
                  <ContactsEditor rows={editing.contacts} onChange={(contacts) => setEditing({ ...editing, contacts })} />
                  <div className="rounded-2xl bg-surface-2 p-4 sm:col-span-2">
                    <p className="mb-1 text-[14px] font-semibold text-ink">Bank account for payments</p>
                    <p className="mb-3 text-[12.5px] text-muted">
                      {current?.accountNumber ? `Currently ${current.accountName} · ${current.bankName}. Fill in to change.` : "Required for automatic payments."}
                    </p>
                    <BankFields value={bank} onChange={setBank} />
                  </div>
                  <Toggle label="Partner shop" sub="Pay automatically when the runner confirms" checked={editing.isPartner} onChange={(v) => setEditing({ ...editing, isPartner: v })} />
                  <Toggle label="Visible to residents" sub="Hide temporarily without deleting" checked={editing.isActive} onChange={(v) => setEditing({ ...editing, isActive: v })} />
                  <Button
                    size="lg"
                    className="sm:col-span-2"
                    loading={pending}
                    disabled={!!bank.accountNumber && !bank.accountName}
                    onClick={() =>
                      start(async () => {
                        const res = await saveVendor({
                          ...editing,
                          contacts: editing.contacts.map(({ label, email }) => ({ label, email })),
                          bank: bank.accountName ? { bankCode: bank.bankCode, bankName: bank.bankName, accountNumber: bank.accountNumber } : null,
                        });
                        if (!res.ok) return toast.error(res.error);
                        toast.success(editing.id ? "Shop saved" : "Shop added", editing.id ? undefined : "Now add their popular items.");
                        router.refresh();
                        if (!editing.id) {
                          setEditing({ ...editing, id: res.data.id });
                          setTab("items");
                        }
                      })
                    }
                  >
                    {editing.id ? "Save shop" : "Add shop"}
                  </Button>
                </motion.div>
              ) : current ? (
                <motion.div key="i" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}>
                  <ItemsEditor vendor={current} />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        ) : null}
      </Sheet>
    </>
  );
}

function CoverEditor({ category, image, onChange }: { category: string; image: string | null; onChange: (image: string | null) => void }) {
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="overflow-hidden rounded-2xl border border-line sm:col-span-2">
      <div className="relative h-40 bg-sunken">
        <Photo src={image ?? categoryPhoto(category)} sizes="(min-width: 640px) 640px, 100vw" />
        {!image ? (
          <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11.5px] font-medium text-white backdrop-blur">
            Default photo for this category
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-[14px] font-semibold text-ink">Shop photo</p>
          <p className="text-[12.5px] text-muted">A clear photo of the shop front or what they sell.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {image ? (
            <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
              Remove
            </Button>
          ) : null}
          <Button variant="secondary" size="sm" loading={busy} onClick={() => input.current?.click()}>
            <Camera className="size-4" /> {image ? "Change" : "Upload"}
          </Button>
        </div>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setBusy(true);
            try {
              onChange((await uploadPhoto(file)).url);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Upload failed");
            } finally {
              setBusy(false);
            }
          }}
        />
      </div>
    </div>
  );
}

function ContactsEditor({ rows, onChange }: { rows: ContactRow[]; onChange: (rows: ContactRow[]) => void }) {
  const update = (key: number, patch: Partial<ContactRow>) => onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  return (
    <div className="rounded-2xl border border-line p-4 sm:col-span-2">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold text-ink">Shop staff on chat</p>
          <p className="text-[12.5px] text-muted">
            Each person signs in with their email to reply to customers. Residents never see it.
          </p>
        </div>
        <MessageCircle className="mt-0.5 size-4 shrink-0 text-faint" />
      </div>
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {rows.map((r) => (
            <motion.li
              key={r.key}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-[1fr_1fr_auto] gap-2"
            >
              <Input aria-label="Email" placeholder="staff@example.com" type="email" inputMode="email" autoCapitalize="none" value={r.email} onChange={(e) => update(r.key, { email: e.target.value })} />
              <Input aria-label="Name" placeholder="Name, e.g. Chika" value={r.label} onChange={(e) => update(r.key, { label: e.target.value })} />
              <button
                type="button"
                title="Remove person"
                onClick={() => onChange(rows.length > 1 ? rows.filter((x) => x.key !== r.key) : [contactRow()])}
                className="grid size-[52px] place-items-center rounded-2xl text-faint hover:bg-danger-soft hover:text-danger"
              >
                <X className="size-4" />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {rows.length < 6 ? (
        <button
          type="button"
          onClick={() => onChange([...rows, contactRow()])}
          className="mt-3 inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-[13.5px] font-semibold text-primary hover:bg-primary-soft"
        >
          <Plus className="size-4" /> Add another person
        </button>
      ) : null}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-2 px-2 py-2">
      <p className="tnum truncate text-[14px] font-semibold text-ink">{value}</p>
      <p className="truncate text-[10.5px] text-muted">{label}</p>
    </div>
  );
}

function Toggle({ label, sub, checked, onChange }: { label: string; sub: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3">
      <div>
        <p className="text-[14px] font-semibold text-ink">{label}</p>
        <p className="text-[12.5px] text-muted">{sub}</p>
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

function ItemsEditor({ vendor }: { vendor: AdminVendor }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);

  const save = (item: { id: string | null; name: string; price: number; unit: string | null; isPopular: boolean; isActive: boolean }) =>
    start(async () => {
      const res = await saveItem({ ...item, unit: item.unit ?? "", vendorId: vendor.id });
      if (!res.ok) return toast.error(res.error);
      router.refresh();
    });

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          save({ id: null, name, price, unit: null, isPopular: false, isActive: true });
          setName("");
          setPrice(0);
        }}
        className="mb-4 grid grid-cols-[1fr_140px_auto] gap-2"
      >
        <Input placeholder="New item, e.g. Jollof rice & chicken" value={name} onChange={(e) => setName(e.target.value)} />
        <MoneyInput value={price} onChange={setPrice} />
        <Button type="submit" size="lg" disabled={!name.trim() || pending}>
          <Plus className="size-4" />
        </Button>
      </form>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
        <AnimatePresence initial={false}>
          {vendor.items.map((it) => (
            <motion.li key={it.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className={cn("flex items-center gap-3 px-4 py-2.5", !it.isActive && "opacity-50")}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-medium text-ink">{it.name}</p>
                <p className="tnum text-[12.5px] text-muted">{naira(it.price)}</p>
              </div>
              <button
                title="Mark as popular"
                onClick={() => save({ ...it, isPopular: !it.isPopular })}
                className={cn("grid size-9 place-items-center rounded-xl transition-colors", it.isPopular ? "bg-accent-soft text-accent-soft-ink" : "text-faint hover:bg-sunken")}
              >
                <Flame className="size-4" />
              </button>
              <Switch checked={it.isActive} onChange={(v) => save({ ...it, isActive: v })} label="Available" />
              <button
                title="Delete"
                onClick={() =>
                  start(async () => {
                    const res = await deleteItem(it.id);
                    if (!res.ok) return toast.error(res.error);
                    router.refresh();
                  })
                }
                className="grid size-9 place-items-center rounded-xl text-faint hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 className="size-4" />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
        {vendor.items.length === 0 ? <li className="px-4 py-8 text-center text-[14px] text-muted">No items yet. Add their most-ordered things.</li> : null}
      </ul>
      <p className="mt-3 text-[12.5px] text-muted">Prices are a guide for residents&apos; budgets — runners pay what the till says.</p>
    </div>
  );
}
