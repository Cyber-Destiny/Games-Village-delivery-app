"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  CircleAlert,
  Home,
  Info,
  MapPin,
  Pencil,
  Plus,
  ShieldCheck,
  Store,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { ShopContacts } from "@/components/app/shop-contact-sheet";
import { CategoryThumb, categoryPhoto, Photo, shopPhoto } from "@/components/brand/photo";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { PhotoPicker } from "@/components/ui/photo-picker";
import { QtyStepper } from "@/components/ui/stepper";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { CATEGORIES, getCategory, type CategoryId } from "@/lib/categories";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import { naira } from "@/lib/money";
import { computeQuote, suggestBudget } from "@/lib/orders/quote";
import type { Shop } from "@/lib/resident";
import { placeErrand } from "../actions";

const ease = [0.22, 1, 0.36, 1] as const;

type Item = { key: string; name: string; qty: number; price: number | null; itemId?: string };

export type Prefill = {
  category: CategoryId | null;
  vendorId?: string | null;
  otherVendorName?: string | null;
  items?: Array<{ name: string; qty: number; price: number | null; itemId?: string }>;
  notes?: string | null;
  pickupFrom?: string | null;
  deliverTo?: string | null;
  budget?: number;
};

type Props = {
  prefill: Prefill;
  shops: Shop[];
  fees: Record<CategoryId, number>;
  loyaltyEvery: number;
  paidCount: number;
  maxBudget: number;
  walletBalance: number;
  open: boolean;
  hours: string;
  address: { block: string; house: string; street: string; landmark: string };
};

let keySeq = 0;
const newKey = () => `i${++keySeq}`;

const PICKUP_SUGGESTIONS = ["Main gate (security post)", "Gate 2", "Estate management office", "A neighbour's house"];

export function NewErrand(props: Props) {
  const router = useRouter();
  const { prefill, shops } = props;

  const [category, setCategory] = useState<CategoryId | null>(prefill.category);
  const [step, setStep] = useState(prefill.category ? 1 : 0);
  const [dir, setDir] = useState(1);

  const [vendorId, setVendorId] = useState<string | null>(prefill.vendorId ?? null);
  const [vendorMode, setVendorMode] = useState<"shop" | "other" | "any">(
    prefill.vendorId ? "shop" : prefill.otherVendorName ? "other" : "any",
  );
  const [otherVendor, setOtherVendor] = useState(prefill.otherVendorName ?? "");
  const [items, setItems] = useState<Item[]>(() => (prefill.items ?? []).map((i) => ({ ...i, key: newKey() })));
  const [draft, setDraft] = useState("");
  const [notes, setNotes] = useState(prefill.notes ?? "");
  const [photo, setPhoto] = useState<{ id: string; url: string } | null>(null);
  const [pickupFrom, setPickupFrom] = useState(prefill.pickupFrom ?? "");
  const [deliverMode, setDeliverMode] = useState<"home" | "other">(prefill.deliverTo ? "other" : "home");
  const [deliverTo, setDeliverTo] = useState(prefill.deliverTo ?? "");
  const [payOnPickup, setPayOnPickup] = useState((prefill.budget ?? 0) > 0);
  const [budget, setBudget] = useState(prefill.budget ?? 0);
  const [budgetTouched, setBudgetTouched] = useState((prefill.budget ?? 0) > 0);
  const [addr, setAddr] = useState(props.address);
  const [editAddr, setEditAddr] = useState(!props.address.block || !props.address.house);
  const [useWallet, setUseWallet] = useState(props.walletBalance > 0);
  const [pending, start] = useTransition();
  const draftRef = useRef<HTMLInputElement>(null);

  const cat = category ? getCategory(category) : null;
  const kind = cat?.kind ?? "buy";
  const shop = shops.find((s) => s.id === vendorId) ?? null;

  const categoryShops = useMemo(() => {
    if (!category) return [];
    const same = shops.filter((s) => s.category === category);
    if (category === "other" || category === "groceries") {
      return [...same, ...shops.filter((s) => s.category !== category && s.category !== "food" && s.category !== "gas" && s.category !== "laundry")];
    }
    return same;
  }, [shops, category]);

  const suggested = suggestBudget(items);
  const effectiveBudget = kind === "buy" ? budget : payOnPickup ? budget : 0;
  const quote = category
    ? computeQuote(
        { fees: props.fees, loyaltyEvery: props.loyaltyEvery },
        { category, budget: effectiveBudget, walletBalance: props.walletBalance, useWallet, paidCount: props.paidCount },
      )
    : null;

  // ── navigation ────────────────────────────────────────────
  function go(next: number) {
    setDir(next > step ? 1 : -1);
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    if (step === 0 || (step === 1 && prefill.category)) router.back();
    else go(step - 1);
  }

  // ── validation ────────────────────────────────────────────
  const detailsError = (() => {
    if (!cat) return "Pick a category";
    if (kind === "buy") {
      if (!items.length && !notes.trim()) return "Add at least one item";
      if (vendorMode === "other" && !otherVendor.trim()) return "Tell us which shop";
    } else {
      if (!pickupFrom.trim()) return "Where should we pick it up?";
      if (!notes.trim() && !items.length) return "Describe what we're picking up";
      if (deliverMode === "other" && !deliverTo.trim()) return "Where should we take it?";
    }
    return null;
  })();

  const budgetError = (() => {
    if (kind === "buy" && budget < 10000) return "Set a budget of at least ₦100";
    if (kind === "pickup" && payOnPickup && budget < 10000) return "Enter the amount to pay";
    if (effectiveBudget > props.maxBudget) return `Maximum is ${naira(props.maxBudget)}`;
    if (!addr.block.trim() || !addr.house.trim()) return "Add your block and house number";
    return null;
  })();

  // ── items ─────────────────────────────────────────────────
  function addDraft() {
    const name = draft.trim();
    if (!name) return;
    haptic(6);
    setItems((s) => [...s, { key: newKey(), name, qty: 1, price: null }]);
    setDraft("");
    draftRef.current?.focus();
  }

  function setMenuQty(it: Shop["items"][number], qty: number) {
    setItems((s) => {
      const existing = s.find((x) => x.itemId === it.id);
      if (qty <= 0) return s.filter((x) => x.itemId !== it.id);
      if (existing) return s.map((x) => (x.itemId === it.id ? { ...x, qty } : x));
      return [...s, { key: newKey(), name: it.name, qty, price: it.price, itemId: it.id }];
    });
  }

  function chooseShop(id: string | null, mode: "shop" | "other" | "any") {
    haptic(6);
    setVendorMode(mode);
    if (id !== vendorId) {
      // Drop menu items from the previous shop, keep custom ones.
      setItems((s) => s.filter((x) => !x.itemId));
    }
    setVendorId(id);
  }

  function toBudgetStep() {
    if (detailsError) return toast.error(detailsError);
    if (!budgetTouched && suggested) setBudget(suggested);
    go(2);
  }

  function submit() {
    if (!category) return;
    if (budgetError) return toast.error(budgetError);
    start(async () => {
      const res = await placeErrand({
        category,
        vendorId: kind === "buy" && vendorMode === "shop" ? vendorId : kind === "pickup" && vendorId ? vendorId : null,
        vendorName: kind === "buy" ? (vendorMode === "other" ? otherVendor.trim() : vendorMode === "any" ? null : null) : pickupFrom.trim(),
        vendorLocation: null,
        pickupFrom: kind === "pickup" ? pickupFrom.trim() : null,
        deliverTo: kind === "pickup" && deliverMode === "other" ? deliverTo.trim() : null,
        items: items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
        notes: notes.trim() || null,
        photoId: photo?.id ?? null,
        budget: effectiveBudget,
        useWallet,
        drop: { block: addr.block, house: addr.house, street: addr.street || null, landmark: addr.landmark || null },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      haptic([10, 40, 10]);
      if (res.data.payUrl) window.location.href = res.data.payUrl;
      else router.replace(`/orders/${res.data.orderId}?new=1`);
    });
  }

  const title = step === 0 ? "New errand" : step === 1 ? cat?.label ?? "Details" : step === 2 ? (kind === "buy" ? "Budget & drop-off" : "Drop-off") : "Review & pay";

  return (
    <div className="min-h-dvh pb-40">
      {/* header */}
      <header className="safe-top sticky top-0 z-30 bg-bg/85 px-5 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-2">
          <motion.button whileTap={{ scale: 0.88 }} onClick={back} aria-label="Back" className="-ml-2 grid size-10 place-items-center rounded-full hover:bg-sunken">
            <ChevronLeft className="size-6" strokeWidth={2.2} />
          </motion.button>
          <AnimatePresence mode="wait" initial={false}>
            <motion.h1
              key={title}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="flex-1 truncate font-display text-[19px] font-semibold"
            >
              {title}
            </motion.h1>
          </AnimatePresence>
          {step > 0 ? <span className="tnum text-[12.5px] font-medium text-muted">Step {step} of 3</span> : null}
        </div>
        <div className="flex gap-1.5 pb-3">
          {[1, 2, 3].map((n) => (
            <span key={n} className="h-1 flex-1 overflow-hidden rounded-full bg-line">
              <motion.span
                className="block h-full rounded-full bg-primary"
                initial={false}
                animate={{ width: step >= n ? "100%" : "0%" }}
                transition={{ duration: 0.5, ease }}
              />
            </span>
          ))}
        </div>
      </header>

      {!props.open ? (
        <div className="mx-5 mt-2 flex items-start gap-2.5 rounded-2xl bg-accent-soft px-4 py-3 text-[13.5px] text-accent-soft-ink">
          <Info className="mt-0.5 size-4 shrink-0" />
          <p>We&apos;re closed right now ({props.hours}). You can plan your errand, but it can only be placed during opening hours.</p>
        </div>
      ) : null}

      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.div
          key={step}
          custom={dir}
          variants={{
            enter: (d: number) => ({ opacity: 0, x: d * 36 }),
            center: { opacity: 1, x: 0 },
            exit: (d: number) => ({ opacity: 0, x: d * -36 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.32, ease }}
          className="px-5 pt-3"
        >
          {/* ── STEP 0: category ── */}
          {step === 0 ? (
            <div>
              <h2 className="font-display text-[28px] font-bold leading-tight">What do you need?</h2>
              <p className="mt-1 text-[15px] text-muted">Pick one to get started.</p>
              <div className="mt-6 space-y-2.5">
                {CATEGORIES.map((c, i) => {
                  return (
                    <motion.button
                      key={c.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.4, ease }}
                      whileTap="hover"
                      whileHover="hover"
                      onClick={() => {
                        haptic(6);
                        setCategory(c.id);
                        setVendorId(null);
                        setVendorMode("any");
                        setItems([]);
                        go(1);
                      }}
                      className="flex w-full items-center gap-4 rounded-[20px] border border-line bg-surface p-2.5 pr-4 text-left"
                    >
                      <CategoryThumb id={c.id} size={64} radius={14} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-[17px] font-semibold text-ink">{c.label}</span>
                        <span className="block text-[13.5px] leading-snug text-muted">{c.blurb}</span>
                      </span>
                      <ArrowRight className="size-5 shrink-0 text-faint" />
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* ── STEP 1: details ── */}
          {step === 1 && cat ? (
            <div className="space-y-7">
              <div className="relative h-32 overflow-hidden rounded-[20px] bg-sunken">
                <Photo src={categoryPhoto(cat.id)} sizes="(min-width: 480px) 440px, 100vw" preload />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
                <div className="absolute inset-x-4 bottom-3 text-white">
                  <p className="font-display text-[20px] font-bold leading-tight">{cat.label}</p>
                  <p className="text-[13px] leading-snug text-white/85">{cat.blurb}</p>
                </div>
              </div>

              {kind === "buy" ? (
                <>
                  <section>
                    <h3 className="mb-3 text-[15px] font-semibold text-ink">Where from?</h3>
                    <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
                      <Chip active={vendorMode === "any"} onClick={() => chooseShop(null, "any")}>
                        Any shop
                      </Chip>
                      {categoryShops.map((s) => (
                        <Chip key={s.id} active={vendorMode === "shop" && vendorId === s.id} onClick={() => chooseShop(s.id, "shop")}>
                          <span className="relative -ml-1.5 block size-6 shrink-0 overflow-hidden rounded-full bg-sunken">
                            <Photo src={shopPhoto(s)} sizes="48px" />
                          </span>
                          {s.name}
                        </Chip>
                      ))}
                      <Chip active={vendorMode === "other"} onClick={() => chooseShop(null, "other")}>
                        <Pencil className="size-4" /> Somewhere else
                      </Chip>
                    </div>
                    <AnimatePresence initial={false}>
                      {vendorMode === "other" ? (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="pt-3">
                            <Input placeholder="Shop name and where it is" value={otherVendor} onChange={(e) => setOtherVendor(e.target.value)} />
                          </div>
                        </motion.div>
                      ) : vendorMode === "any" ? (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-2.5 text-[13px] text-muted">
                          Your runner will pick the best place in the estate.
                        </motion.p>
                      ) : shop ? (
                        <motion.div key={shop.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="pt-3">
                          <div className="overflow-hidden rounded-[18px] border border-line bg-surface">
                            <div className="flex items-center gap-3 p-3">
                              <span className="relative block size-12 shrink-0 overflow-hidden rounded-xl bg-sunken">
                                <Photo src={shopPhoto(shop)} sizes="96px" />
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-[15px] font-semibold text-ink">{shop.name}</p>
                                <p className="truncate text-[12.5px] text-muted">{[shop.location, shop.hours].filter(Boolean).join(" · ")}</p>
                              </div>
                            </div>
                            <p className="border-t border-line px-3 pt-3 text-[13px] text-ink-2">Rather order directly? Call or WhatsApp them:</p>
                            <ShopContacts shop={shop} className="m-3 mt-2" />
                            <Link
                              href={`/collect?vendor=${shop.id}`}
                              className="flex items-center justify-between gap-2 border-t border-line px-4 py-3 text-[13.5px] font-semibold text-primary"
                            >
                              Already paid {shop.name}? Send a rider <ArrowRight className="size-4" />
                            </Link>
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </section>

                  {shop && shop.items.length ? (
                    <section>
                      <h3 className="mb-3 text-[15px] font-semibold text-ink">From {shop.name}</h3>
                      <div className="divide-y divide-line overflow-hidden rounded-[22px] bg-surface shadow-[var(--shadow-card)] ring-1 ring-line/60">
                        {shop.items.map((it) => {
                          const inCart = items.find((x) => x.itemId === it.id);
                          return (
                            <div key={it.id} className="flex items-center gap-3 px-4 py-3">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[14.5px] font-medium text-ink">
                                  {it.name}
                                  {it.popular ? <span className="ml-2 rounded-md bg-accent-soft px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-accent-soft-ink">Popular</span> : null}
                                </p>
                                <p className="tnum text-[13px] text-muted">
                                  {naira(it.price)}
                                  {it.unit ? ` · ${it.unit}` : ""}
                                </p>
                              </div>
                              <AnimatePresence mode="popLayout" initial={false}>
                                {inCart ? (
                                  <motion.div key="q" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                                    <QtyStepper value={inCart.qty} onChange={(q) => setMenuQty(it, q)} onRemove={() => setMenuQty(it, 0)} />
                                  </motion.div>
                                ) : (
                                  <motion.button
                                    key="add"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    whileTap={{ scale: 0.88 }}
                                    onClick={() => {
                                      haptic(6);
                                      setMenuQty(it, 1);
                                    }}
                                    aria-label={`Add ${it.name}`}
                                    className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary-soft-ink"
                                  >
                                    <Plus className="size-[18px]" strokeWidth={2.4} />
                                  </motion.button>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ) : null}

                  <section>
                    <h3 className="mb-3 text-[15px] font-semibold text-ink">{shop?.items.length ? "Anything else?" : "Your list"}</h3>
                    <div className="space-y-2">
                      <AnimatePresence initial={false}>
                        {items
                          .filter((i) => !i.itemId)
                          .map((i) => (
                            <motion.div
                              key={i.key}
                              layout
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-2.5 ring-1 ring-line/70">
                                <span className="size-2 shrink-0 rounded-full bg-primary" />
                                <p className="min-w-0 flex-1 truncate text-[14.5px] font-medium text-ink">{i.name}</p>
                                <QtyStepper
                                  value={i.qty}
                                  onChange={(q) => setItems((s) => s.map((x) => (x.key === i.key ? { ...x, qty: q } : x)))}
                                  onRemove={() => setItems((s) => s.filter((x) => x.key !== i.key))}
                                />
                              </div>
                            </motion.div>
                          ))}
                      </AnimatePresence>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          addDraft();
                        }}
                        className="flex gap-2"
                      >
                        <Input ref={draftRef} placeholder={cat.hint} value={draft} onChange={(e) => setDraft(e.target.value)} />
                        <Button type="submit" variant="soft" size="lg" className="w-[52px] shrink-0 px-0" disabled={!draft.trim()} aria-label="Add item">
                          <Plus className="size-5" strokeWidth={2.4} />
                        </Button>
                      </form>
                    </div>
                  </section>
                </>
              ) : (
                <>
                  <section>
                    <h3 className="mb-3 text-[15px] font-semibold text-ink">Pick it up from</h3>
                    <Input placeholder="e.g. Main gate, with security" value={pickupFrom} onChange={(e) => setPickupFrom(e.target.value)} leading={<MapPin className="size-[18px]" />} />
                    <div className="no-scrollbar -mx-5 mt-2.5 flex gap-2 overflow-x-auto px-5">
                      {[...PICKUP_SUGGESTIONS, ...categoryShops.map((s) => s.name)].map((sug) => (
                        <Chip
                          key={sug}
                          small
                          active={pickupFrom === sug}
                          onClick={() => {
                            setPickupFrom(sug);
                            const s = categoryShops.find((x) => x.name === sug);
                            setVendorId(s?.id ?? null);
                          }}
                        >
                          {sug}
                        </Chip>
                      ))}
                    </div>
                  </section>
                  <section>
                    <h3 className="mb-3 text-[15px] font-semibold text-ink">What are we picking up?</h3>
                    <Textarea placeholder={cat.hint} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                  </section>
                  <section>
                    <h3 className="mb-3 text-[15px] font-semibold text-ink">Bring it to</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <Choice active={deliverMode === "home"} onClick={() => setDeliverMode("home")} icon={<Home className="size-5" />} title="My home" sub={`Block ${addr.block || "?"}, ${addr.house || "?"}`} />
                      <Choice active={deliverMode === "other"} onClick={() => setDeliverMode("other")} icon={<MapPin className="size-5" />} title="Somewhere else" sub="In the estate" />
                    </div>
                    <AnimatePresence initial={false}>
                      {deliverMode === "other" ? (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="pt-3">
                            <Input placeholder={category === "laundry" ? "e.g. FreshFold Dry Cleaners" : "Where should it go?"} value={deliverTo} onChange={(e) => setDeliverTo(e.target.value)} />
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </section>
                  <section className="flex items-center justify-between gap-4 rounded-[22px] bg-surface p-4 ring-1 ring-line/70">
                    <div>
                      <p className="text-[14.5px] font-semibold text-ink">Something to pay on collection?</p>
                      <p className="text-[13px] text-muted">e.g. a laundry bill or delivery charge</p>
                    </div>
                    <Switch checked={payOnPickup} onChange={setPayOnPickup} label="Pay on collection" />
                  </section>
                </>
              )}

              {kind === "buy" ? (
                <section>
                  <Field label="Notes for your runner" optional>
                    <Textarea
                      placeholder={category === "food" ? "e.g. Not too spicy, extra plantain" : "Brands, sizes, alternatives if they're out…"}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </Field>
                </section>
              ) : null}

              <PhotoPicker value={photo} onChange={setPhoto} label="Add a photo" hint={kind === "buy" ? "Show exactly what you want" : "Helps your runner find it"} />
            </div>
          ) : null}

          {/* ── STEP 2: budget + address ── */}
          {step === 2 && cat ? (
            <div className="space-y-7">
              {kind === "buy" || payOnPickup ? (
                <section>
                  <h2 className="font-display text-[26px] font-bold leading-tight">{kind === "buy" ? "Set a budget" : "Amount to pay"}</h2>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-muted">
                    {kind === "buy"
                      ? "The most your runner can spend on the items. You only pay what things actually cost."
                      : "What the runner should pay when collecting."}
                  </p>
                  <MoneyInput
                    size="lg"
                    className="mt-5"
                    value={budget}
                    onChange={(v) => {
                      setBudget(v);
                      setBudgetTouched(true);
                    }}
                    autoFocus={!suggested}
                  />
                  {suggested ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {[suggested, Math.ceil((suggested * 1.25) / 50000) * 50000].map((v, i) => (
                        <button
                          key={v + "-" + i}
                          onClick={() => {
                            haptic(5);
                            setBudget(v);
                            setBudgetTouched(true);
                          }}
                          className={cn(
                            "rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors",
                            budget === v ? "bg-primary text-primary-ink" : "bg-sunken text-ink-2 hover:bg-line",
                          )}
                        >
                          {i === 0 ? "Suggested " : "Extra room "}
                          <span className="tnum">{naira(v)}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {kind === "buy" && suggested && budget > 0 && budget < suggestBudget(items) / 1.1 ? (
                    <p className="mt-3 flex items-center gap-1.5 text-[13px] font-medium text-accent-soft-ink">
                      <CircleAlert className="size-4" /> That&apos;s less than the listed prices ({naira(Math.round(suggestBudget(items) / 1.1))}).
                    </p>
                  ) : null}
                  {kind === "buy" ? (
                    <div className="mt-5 flex gap-3 rounded-2xl bg-primary-soft p-4 text-[13.5px] leading-relaxed text-primary-soft-ink">
                      <Wallet className="mt-0.5 size-5 shrink-0" />
                      <p>We pay the shop directly from your budget. Whatever&apos;s left over goes straight to your wallet when the errand is delivered.</p>
                    </div>
                  ) : null}
                </section>
              ) : (
                <section>
                  <h2 className="font-display text-[26px] font-bold leading-tight">Where to?</h2>
                  <p className="mt-1 text-[14.5px] text-muted">Check your address so your runner finds you first time.</p>
                </section>
              )}

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-[15px] font-semibold text-ink">{deliverMode === "other" && kind === "pickup" ? "Your address (for contact)" : "Deliver to"}</h3>
                  {!editAddr ? (
                    <button onClick={() => setEditAddr(true)} className="text-[13.5px] font-semibold text-primary">
                      Change
                    </button>
                  ) : null}
                </div>
                <AnimatePresence mode="wait" initial={false}>
                  {editAddr ? (
                    <motion.div key="edit" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3 rounded-[22px] bg-surface p-4 ring-1 ring-line/70">
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Block">
                          <Input value={addr.block} onChange={(e) => setAddr({ ...addr, block: e.target.value })} placeholder="e.g. C" />
                        </Field>
                        <Field label="House / Flat">
                          <Input value={addr.house} onChange={(e) => setAddr({ ...addr, house: e.target.value })} placeholder="e.g. 14" />
                        </Field>
                      </div>
                      <Field label="Street" optional>
                        <Input value={addr.street} onChange={(e) => setAddr({ ...addr, street: e.target.value })} />
                      </Field>
                      <Field label="Landmark" optional>
                        <Input value={addr.landmark} onChange={(e) => setAddr({ ...addr, landmark: e.target.value })} placeholder="e.g. Blue gate by the playground" />
                      </Field>
                      <Button variant="secondary" size="sm" onClick={() => addr.block && addr.house && setEditAddr(false)} disabled={!addr.block || !addr.house}>
                        <Check className="size-4" /> Done
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div key="view" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-3 rounded-[22px] bg-surface p-4 ring-1 ring-line/70">
                      <span className="grid size-11 place-items-center rounded-2xl bg-hero text-hero-ink">
                        <Home className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">
                          Block {addr.block}, House {addr.house}
                        </p>
                        <p className="truncate text-[13px] text-muted">{[addr.street, addr.landmark].filter(Boolean).join(" · ") || "No directions added"}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            </div>
          ) : null}

          {/* ── STEP 3: review ── */}
          {step === 3 && cat && quote ? (
            <div className="space-y-5">
              <section className="overflow-hidden rounded-[24px] bg-surface shadow-[var(--shadow-card)] ring-1 ring-line/60">
                <div className="flex items-center gap-3 border-b border-line p-4">
                  <CategoryThumb id={cat.id} size={44} />
                  <div className="min-w-0">
                    <p className="font-display text-[17px] font-semibold text-ink">{cat.label}</p>
                    <p className="truncate text-[13px] text-ink-2">
                      {kind === "pickup" ? `From ${pickupFrom}` : vendorMode === "shop" && shop ? shop.name : vendorMode === "other" ? otherVendor : "Any shop in the estate"}
                    </p>
                  </div>
                  <button onClick={() => go(1)} className="ml-auto grid size-9 shrink-0 place-items-center rounded-full bg-surface/70" aria-label="Edit">
                    <Pencil className="size-4 text-ink-2" />
                  </button>
                </div>
                <div className="space-y-2 p-4">
                  {items.map((i) => (
                    <div key={i.key} className="flex items-baseline justify-between gap-3 text-[14.5px]">
                      <span className="text-ink">
                        <span className="tnum mr-1.5 font-semibold text-muted">{i.qty}×</span>
                        {i.name}
                      </span>
                      {i.price ? <span className="tnum shrink-0 text-muted">{naira(i.price * i.qty)}</span> : null}
                    </div>
                  ))}
                  {notes ? <p className="rounded-xl bg-surface-2 px-3 py-2 text-[13.5px] leading-relaxed text-ink-2">“{notes}”</p> : null}
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo.url} alt="" className="h-20 w-20 rounded-xl object-cover ring-1 ring-line" />
                  ) : null}
                  <div className="flex items-center gap-2 border-t border-line pt-3 text-[13.5px] text-ink-2">
                    <Home className="size-4 text-muted" />
                    {kind === "pickup" && deliverMode === "other" ? deliverTo : `Block ${addr.block}, House ${addr.house}`}
                  </div>
                </div>
              </section>

              <section className="rounded-[24px] bg-surface p-4 shadow-[var(--shadow-card)] ring-1 ring-line/60">
                <Row label={kind === "buy" ? "Items budget" : "To pay on collection"} value={naira(effectiveBudget)} hint={kind === "buy" ? "Change comes back to your wallet" : undefined} />
                <Row
                  label="Service fee"
                  value={
                    quote.loyaltyFree ? (
                      <span className="flex items-center gap-2">
                        <span className="text-faint line-through">{naira(quote.serviceFee)}</span>
                        <span className="font-semibold text-primary">Free</span>
                      </span>
                    ) : (
                      naira(quote.serviceFee)
                    )
                  }
                  hint={quote.loyaltyFree ? `Your ${props.loyaltyEvery}th errand is on us` : quote.loyaltyRemaining > 0 ? `${quote.loyaltyRemaining} more until a free one` : undefined}
                />
                {props.walletBalance > 0 ? (
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-3.5 py-3">
                    <div className="flex items-center gap-2.5">
                      <Wallet className="size-[18px] text-primary" />
                      <div>
                        <p className="text-[14px] font-medium text-ink">Use wallet</p>
                        <p className="tnum text-[12.5px] text-muted">Balance {naira(props.walletBalance)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <AnimatePresence>
                        {useWallet ? (
                          <motion.span initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="tnum text-[14px] font-semibold text-primary">
                            −{naira(quote.walletApplied)}
                          </motion.span>
                        ) : null}
                      </AnimatePresence>
                      <Switch checked={useWallet} onChange={setUseWallet} label="Use wallet balance" />
                    </div>
                  </div>
                ) : null}
                <div className="mt-3 flex items-end justify-between border-t border-dashed border-line-strong pt-4">
                  <span className="text-[15px] font-semibold text-ink">You pay now</span>
                  <motion.span key={quote.toPay} initial={{ scale: 0.9, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} className="tnum font-display text-[28px] font-bold leading-none text-ink">
                    {naira(quote.toPay)}
                  </motion.span>
                </div>
              </section>

              <div className="flex gap-3 px-1 text-[12.5px] leading-relaxed text-muted">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                <p>Only pay inside the app — never give cash or transfers to a runner. Every in-app errand is covered if something goes wrong.</p>
              </div>
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>

      {/* sticky action bar */}
      {step > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px]">
          <div className="safe-bottom border-t border-line/70 bg-bg/90 px-5 pt-3 backdrop-blur-xl">
            {step === 1 ? (
              <Button size="xl" block onClick={toBudgetStep} disabled={!!detailsError}>
                {detailsError ?? "Continue"} {detailsError ? null : <ArrowRight className="size-5" />}
              </Button>
            ) : step === 2 ? (
              <div className="flex items-center gap-3">
                {quote ? (
                  <div className="min-w-0">
                    <p className="text-[12px] text-muted">Total</p>
                    <p className="tnum font-display text-[20px] font-bold leading-tight">{naira(quote.total)}</p>
                  </div>
                ) : null}
                <Button size="xl" className="flex-1" onClick={() => (budgetError ? toast.error(budgetError) : go(3))}>
                  Review <ArrowRight className="size-5" />
                </Button>
              </div>
            ) : step === 3 && quote ? (
              <Button size="xl" block onClick={submit} loading={pending} disabled={!props.open}>
                {!props.open ? "Closed right now" : quote.toPay === 0 ? "Place errand" : `Pay ${naira(quote.toPay)}`}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Chip({ active, onClick, children, small }: { active: boolean; onClick: () => void; children: React.ReactNode; small?: boolean }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border font-medium transition-colors",
        small ? "h-8 px-3 text-[12.5px]" : "h-10 px-4 text-[13.5px]",
        active ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-2 hover:border-line-strong",
      )}
    >
      {children}
    </motion.button>
  );
}

function Choice({ active, onClick, icon, title, sub }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-start gap-2 rounded-[20px] border-2 p-3.5 text-left transition-colors",
        active ? "border-primary bg-primary-soft/60" : "border-line bg-surface",
      )}
    >
      <span className={cn("grid size-9 place-items-center rounded-xl", active ? "bg-primary text-primary-ink" : "bg-sunken text-ink-2")}>{icon}</span>
      <span>
        <span className="block text-[14px] font-semibold text-ink">{title}</span>
        <span className="block text-[12.5px] text-muted">{sub}</span>
      </span>
      {active ? (
        <motion.span layoutId="choice-check" className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-primary text-primary-ink">
          <Check className="size-3" strokeWidth={3} />
        </motion.span>
      ) : null}
    </motion.button>
  );
}

function Row({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <div>
        <p className="text-[14.5px] text-ink-2">{label}</p>
        {hint ? <p className="text-[12px] text-muted">{hint}</p> : null}
      </div>
      <div className="tnum text-[14.5px] font-medium text-ink">{value}</div>
    </div>
  );
}
