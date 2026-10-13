"use client";

import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { ArrowRight, BadgeCheck, ChevronDown, Package, Receipt, ShieldCheck, Wallet } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { CategoryArt, tintFor } from "@/components/brand/category-art";
import { EstateMap } from "@/components/brand/estate-map";
import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/button";
import { APP_NAME, ESTATE_NAME } from "@/lib/brand";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/cn";

type Props = {
  signedIn: boolean;
  appHref: string;
  minFee: string;
  hours: string;
  loyaltyEvery: number;
};

const ease = [0.22, 1, 0.36, 1] as const;

function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, ease, delay }}
    >
      {children}
    </motion.div>
  );
}

function Swash() {
  return (
    <svg viewBox="0 0 300 24" className="absolute -bottom-2 left-0 h-[0.42em] w-full" preserveAspectRatio="none" aria-hidden>
      <motion.path
        d="M4 16 C 60 6, 120 4, 180 9 S 270 18, 296 8"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="7"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease, delay: 0.55 }}
      />
    </svg>
  );
}

function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      <motion.div
        initial={{ opacity: 0, y: 40, rotate: 2 }}
        animate={{ opacity: 1, y: 0, rotate: -1.5 }}
        transition={{ duration: 1, ease, delay: 0.2 }}
        className="relative rounded-[34px] bg-surface p-3 shadow-[var(--shadow-pop)] ring-1 ring-line/60"
      >
        <EstateMap demo progress={0} height={300} className="rounded-[26px]" />
        <div className="absolute inset-x-6 bottom-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6, ease }}
            className="flex items-center gap-3 rounded-2xl bg-surface/95 p-3 shadow-[var(--shadow-raised)] ring-1 ring-line/60 backdrop-blur"
          >
            <Avatar name="Adaeze Okafor" size={42} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14.5px] font-semibold text-ink">Adaeze is on the way</p>
              <p className="truncate text-[12.5px] text-muted">2 loaves · Peak milk · eggs</p>
            </div>
            <span className="rounded-xl bg-primary-soft px-2.5 py-1.5 font-display text-[13px] font-semibold text-primary-soft-ink">
              Block C
            </span>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20, y: 10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 1.2, duration: 0.6, ease }}
        className="absolute -right-2 -top-5 sm:-right-8"
      >
        <div className="animate-[var(--animate-float)] rounded-2xl bg-hero px-3.5 py-2.5 text-hero-ink shadow-[var(--shadow-raised)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-hero-muted">Change</p>
          <p className="font-display text-[17px] font-semibold">+₦350 → wallet</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.4, duration: 0.6, ease }}
        className="absolute -left-3 top-1/3 sm:-left-10"
      >
        <div className="flex animate-[var(--animate-float)] items-center gap-2 rounded-2xl bg-surface px-3 py-2.5 shadow-[var(--shadow-raised)] ring-1 ring-line/60 [animation-delay:-3s]">
          <span className="grid size-8 place-items-center rounded-xl bg-accent-soft">
            <Receipt className="size-4 text-accent-soft-ink" />
          </span>
          <div>
            <p className="text-[11px] text-muted">Shop paid directly</p>
            <p className="font-display text-[14px] font-semibold text-ink">₦4,650</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const STEPS = [
  {
    n: "01",
    title: "Tell us what you need",
    body: "Pick a shop in the estate or just describe it. Set a budget for the items — that's the most you'll spend.",
  },
  {
    n: "02",
    title: "We pay the shop directly",
    body: "Your money never passes through a runner's hands. They snap the receipt and we transfer to the shop.",
  },
  {
    n: "03",
    title: "Give your code at the door",
    body: "Check everything, then share your 4-digit code. Any change lands in your wallet instantly.",
  },
];

const FAQ = (p: Props) => [
  {
    q: "How much does it cost?",
    a: `You pay for the items plus a small service fee, from ${p.minFee}. You'll always see the full amount before you pay.`,
  },
  {
    q: "How do I pay?",
    a: "Card, bank transfer or USSD through Paystack, or from your wallet. Never pay a runner directly — payments outside the app aren't covered.",
  },
  {
    q: "What if the items cost more than my budget?",
    a: "Your runner sends a request in the app. You approve the extra amount (or tell them to remove something) before anything is bought.",
  },
  {
    q: "What if something is wrong or missing?",
    a: "Don't give your code until you're happy. If something still goes wrong, message us from the errand and we'll refund you.",
  },
  {
    q: "When do you run?",
    a: `Every day, ${p.hours}. Errands inside ${ESTATE_NAME} only.`,
  },
];

function Faq(props: Props) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-line rounded-[26px] bg-surface px-5 shadow-[var(--shadow-card)] ring-1 ring-line/60 sm:px-7">
      {FAQ(props).map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q}>
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 py-5 text-left"
              aria-expanded={isOpen}
            >
              <span className="font-display text-[17px] font-semibold text-ink">{f.q}</span>
              <motion.span animate={{ rotate: isOpen ? 180 : 0 }} className="grid size-8 shrink-0 place-items-center rounded-full bg-sunken">
                <ChevronDown className="size-4 text-ink-2" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.32, ease }}
                  className="overflow-hidden"
                >
                  <p className="pb-5 pr-10 text-[15px] leading-relaxed text-ink-2">{f.a}</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export function Landing(props: Props) {
  const { signedIn, appHref, loyaltyEvery } = props;
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.2]);

  const cta = signedIn ? appHref : "/login";

  return (
    <div className="relative overflow-x-clip">
      {/* ambient background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[780px] opacity-90"
        style={{
          background:
            "radial-gradient(60% 50% at 85% 10%, color-mix(in oklab, var(--accent) 22%, transparent), transparent 70%), radial-gradient(50% 45% at 0% 30%, color-mix(in oklab, var(--primary) 16%, transparent), transparent 70%)",
        }}
      />

      <header className="safe-top relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <Logo />
        <LinkButton href={cta} variant="secondary" size="sm">
          {signedIn ? "Open app" : "Sign in"}
        </LinkButton>
      </header>

      {/* HERO */}
      <section ref={heroRef} className="relative z-10 mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-6 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-14">
        <motion.div style={{ y: heroY, opacity: heroOpacity }}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 py-1.5 pl-2 pr-3.5 text-[13px] font-medium text-ink-2 shadow-[var(--shadow-card)] backdrop-blur"
          >
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-[var(--animate-pulse-ring)] rounded-full bg-primary" />
              <span className="relative size-2 rounded-full bg-primary" />
            </span>
            Now running in {ESTATE_NAME}, Abuja
          </motion.div>

          <h1 className="mt-6 font-display text-[44px] font-bold leading-[0.98] tracking-[-0.035em] text-ink sm:text-[64px] lg:text-[72px]">
            {["Anything", "in the estate,"].map((w, i) => (
              <motion.span
                key={w}
                className="block"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease, delay: 0.08 + i * 0.08 }}
              >
                {w}
              </motion.span>
            ))}
            <motion.span
              className="relative inline-block text-primary"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease, delay: 0.24 }}
            >
              at your door.
              <Swash />
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.35 }}
            className="mt-6 max-w-[34rem] text-[17px] leading-relaxed text-ink-2 sm:text-[19px]"
          >
            Food, groceries, gas refills, parcels from the gate. Tell {APP_NAME} what you need — a vetted runner from the estate
            gets it done while you stay home.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.45 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <LinkButton href={cta} size="xl" className="group">
              Start an errand
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" />
            </LinkButton>
            <LinkButton href="#how" variant="secondary" size="xl">
              How it works
            </LinkButton>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="mt-8 flex items-center gap-3"
          >
            <div className="flex -space-x-1.5">
              {["Musa Bello", "Chioma Eze", "Tunde Ade", "Grace Okon"].map((n) => (
                <Avatar key={n} name={n} size={34} ring />
              ))}
            </div>
            <p className="text-[13.5px] leading-snug text-muted">
              Runners are vetted with <span className="font-medium text-ink-2">NIN &amp; a guarantor</span>
              <br className="hidden sm:block" /> and wear the {APP_NAME} bag.
            </p>
          </motion.div>
        </motion.div>

        <HeroVisual />
      </section>

      {/* CATEGORIES */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <Reveal>
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-primary">What we run</p>
          <h2 className="mt-3 max-w-xl font-display text-[34px] font-bold leading-[1.05] text-ink sm:text-[44px]">
            Little errands that eat your day.
          </h2>
        </Reveal>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {CATEGORIES.map((c, i) => {
            const t = tintFor(c.id);
            return (
              <Reveal key={c.id} delay={i * 0.05}>
                <motion.div
                  initial="rest"
                  whileHover="hover"
                  whileTap="hover"
                  animate="rest"
                  className="group relative h-full overflow-hidden rounded-[26px] p-5 sm:p-6"
                  style={{ background: t.bg }}
                >
                  <CategoryArt id={c.id} size={64} className="transition-transform duration-500 group-hover:scale-105" />
                  <h3 className="mt-6 font-display text-[19px] font-semibold text-ink sm:text-[22px]">{c.label}</h3>
                  <p className="mt-1 text-[13.5px] leading-snug text-ink-2 sm:text-[15px]">{c.blurb}</p>
                </motion.div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="relative z-10 mx-auto max-w-6xl scroll-mt-10 px-5 py-16 sm:px-8">
        <Reveal>
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-primary">How it works</p>
          <h2 className="mt-3 max-w-xl font-display text-[34px] font-bold leading-[1.05] text-ink sm:text-[44px]">
            Three steps. You never leave the house.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.08}>
              <div className="card relative h-full overflow-hidden p-7">
                <div className="flex h-[112px] items-start justify-between gap-4">
                  <span className="font-display text-[56px] font-bold leading-none text-line-strong/70">{s.n}</span>
                  <StepArt i={i} />
                </div>
                <h3 className="mt-6 font-display text-[22px] font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* PROMISE */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <Reveal>
          <div className="grain relative overflow-hidden rounded-[34px] bg-hero px-6 py-12 text-hero-ink sm:px-12 sm:py-16">
            <div
              aria-hidden
              className="absolute -right-24 -top-24 size-[420px] rounded-full opacity-60 blur-3xl"
              style={{ background: "radial-gradient(circle, color-mix(in oklab, var(--accent) 45%, transparent), transparent 65%)" }}
            />
            <div className="relative z-10 grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
              <div>
                <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-accent">The {APP_NAME} promise</p>
                <h2 className="mt-3 font-display text-[34px] font-bold leading-[1.05] sm:text-[46px]">
                  Pay only in the app.
                  <br />
                  Every errand is covered.
                </h2>
                <p className="mt-4 max-w-md text-[16px] leading-relaxed text-hero-muted">
                  When you pay through {APP_NAME}, we&apos;ve got your back — from the shop counter to your front door.
                </p>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: ShieldCheck, t: "Wrong or missing items", d: "Refunded, no back-and-forth." },
                  { icon: Wallet, t: "Change to your wallet", d: "Instantly, to the kobo." },
                  { icon: BadgeCheck, t: "Vetted runners", d: "NIN-checked, with a guarantor." },
                  { icon: Package, t: "Receipt on every buy", d: "See exactly what was paid." },
                ].map(({ icon: Icon, t, d }) => (
                  <li key={t} className="rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/10">
                    <Icon className="size-6 text-accent" strokeWidth={1.8} />
                    <p className="mt-3 font-display text-[17px] font-semibold">{t}</p>
                    <p className="mt-0.5 text-[14px] text-hero-muted">{d}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </section>

      {/* LOYALTY */}
      {loyaltyEvery > 0 ? (
        <section className="relative z-10 mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <Reveal>
            <div className="card flex flex-col gap-8 p-8 sm:p-12 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-display text-[30px] font-bold leading-tight text-ink sm:text-[40px]">
                  Every {ordinal(loyaltyEvery)} errand fee is on us.
                </h2>
                <p className="mt-2 text-[16px] text-ink-2">No codes, no catch. It just happens.</p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {Array.from({ length: loyaltyEvery }).map((_, i) => {
                  const last = i === loyaltyEvery - 1;
                  return (
                    <motion.span
                      key={i}
                      initial={{ scale: 0, rotate: -30 }}
                      whileInView={{ scale: 1, rotate: 0 }}
                      viewport={{ once: true }}
                      transition={{ type: "spring", stiffness: 420, damping: 16, delay: 0.2 + i * 0.07 }}
                      className={cn(
                        "grid size-11 place-items-center rounded-full font-display text-[14px] font-semibold",
                        last ? "bg-accent text-accent-ink shadow-[0_8px_20px_-8px_rgb(200_130_0/0.7)]" : "bg-primary-soft text-primary-soft-ink",
                      )}
                    >
                      {last ? "Free" : i + 1}
                    </motion.span>
                  );
                })}
              </div>
            </div>
          </Reveal>
        </section>
      ) : null}

      {/* FAQ */}
      <section className="relative z-10 mx-auto max-w-3xl px-5 py-16 sm:px-8">
        <Reveal>
          <h2 className="mb-8 text-center font-display text-[34px] font-bold text-ink sm:text-[44px]">Questions</h2>
          <Faq {...props} />
        </Reveal>
      </section>

      {/* FOOTER CTA */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-10 pt-6 sm:px-8">
        <Reveal>
          <div className="flex flex-col items-center rounded-[34px] bg-primary px-6 py-14 text-center text-primary-ink shadow-[var(--shadow-raised)]">
            <h2 className="font-display text-[34px] font-bold leading-tight sm:text-[48px]">Ready when you are.</h2>
            <p className="mt-2 max-w-md text-[16px] opacity-80">Sign in with your phone number. It takes about 20 seconds.</p>
            <Link
              href={cta}
              className="mt-8 inline-flex h-14 items-center gap-2 rounded-[20px] bg-white px-7 text-[17px] font-semibold text-[#0b3526] shadow-[0_10px_30px_-10px_rgb(0_0_0/0.4)] transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              Start an errand <ArrowRight className="size-5" />
            </Link>
          </div>
        </Reveal>
        <footer className="mt-10 flex flex-col items-center justify-between gap-3 pb-6 text-[13px] text-muted sm:flex-row">
          <Logo size={26} className="scale-90" />
          <p>
            © {new Date().getFullYear()} {APP_NAME} · Made for {ESTATE_NAME}, Abuja
          </p>
        </footer>
      </section>
    </div>
  );
}

function StepArt({ i }: { i: number }) {
  if (i === 0)
    return (
      <div className="w-[150px] space-y-1.5 rounded-2xl bg-surface-2 p-2.5 ring-1 ring-line/70">
        {["2× Bread", "Peak milk", "Eggs"].map((t, k) => (
          <motion.div
            key={t}
            initial={{ opacity: 0, x: 10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 + k * 0.12 }}
            className="flex items-center gap-2 rounded-lg bg-surface px-2 py-1.5 text-[11.5px] font-medium text-ink-2 shadow-[var(--shadow-card)]"
          >
            <span className="size-1.5 rounded-full bg-primary" />
            {t}
          </motion.div>
        ))}
      </div>
    );
  if (i === 1)
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
        className="flex w-[150px] flex-col items-center rounded-2xl bg-hero px-3 py-3 text-hero-ink"
      >
        <span className="grid size-8 place-items-center rounded-full bg-accent text-accent-ink">
          <BadgeCheck className="size-4" />
        </span>
        <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">Shop paid</span>
        <span className="font-display text-[18px] font-bold">₦4,650</span>
      </motion.div>
    );
  return (
    <div className="flex gap-1.5">
      {["4", "8", "2", "7"].map((d, k) => (
        <motion.span
          key={k}
          initial={{ rotateX: -90, opacity: 0 }}
          whileInView={{ rotateX: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 + k * 0.1, type: "spring", stiffness: 300, damping: 18 }}
          style={{ transformPerspective: 300 }}
          className="grid h-11 w-9 place-items-center rounded-xl bg-hero font-display text-[20px] font-bold text-hero-ink"
        >
          {d}
        </motion.span>
      ))}
    </div>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
