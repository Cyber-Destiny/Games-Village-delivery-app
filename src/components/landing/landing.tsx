"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, BadgeCheck, ChevronDown, Package, ShieldCheck, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { categoryPhoto, Photo } from "@/components/brand/photo";
import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/button";
import { APP_NAME, ESTATE_NAME } from "@/lib/brand";
import { CATEGORIES } from "@/lib/categories";
import { PHOTOS } from "@/lib/photos";

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
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease, delay }}
    >
      {children}
    </motion.div>
  );
}

const STEPS = [
  {
    photo: PHOTOS.shopMart,
    title: "Order from an estate shop",
    body: "Chat with the shop right in the app, agree the price and pay them directly. Or tell us what you need and your runner buys it.",
  },
  {
    photo: PHOTOS.heroRider,
    title: "A runner brings it over",
    body: "Book a rider in a tap. They collect it and head to your door, and you can follow every step live.",
  },
  {
    photo: categoryPhoto("pickup"),
    title: "Give your code at the door",
    body: "Check everything first, then share your 4-digit code. Only that code completes the errand.",
  },
];

const FAQ = (p: Props) => [
  {
    q: "How much does it cost?",
    a: `Delivery starts from ${p.minFee}. If you order from a shop yourself, you pay the shop for your items and pay us only for delivery. You always see the full amount before you pay.`,
  },
  {
    q: "When do I pay the delivery fee?",
    a: "When you book the rider, in the app, by card, transfer, USSD or wallet. Never give a rider cash. Cancel before they reach the shop and the fee goes back to your wallet.",
  },
  {
    q: "Can a runner buy things for me?",
    a: "Yes. Set a budget, the runner shows us the receipt and we pay the shop directly. Any change goes to your wallet when the errand is delivered.",
  },
  {
    q: "Can I pay or book a runner directly?",
    a: `Please don't. Errands are only covered when they're booked and paid for in ${APP_NAME}. Anything you arrange with a runner or shop outside the app, like paying cash or booking them privately, is at your own risk, and we aren't responsible for what happens.`,
  },
  {
    q: "What if something is wrong or missing?",
    a: "Don't give your code until you're happy. If something still goes wrong, message us from the errand and we'll sort it out.",
  },
  {
    q: "When do you run?",
    a: `Every day, ${p.hours}. Errands inside ${ESTATE_NAME} only.`,
  },
];

function Faq(props: Props) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-line border-y border-line">
      {FAQ(props).map((f, i) => (
        <div key={f.q}>
          <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-4 py-5 text-left">
            <span className="font-display text-[17px] font-semibold text-ink sm:text-[19px]">{f.q}</span>
            <motion.span animate={{ rotate: open === i ? 180 : 0 }} className="shrink-0 text-muted">
              <ChevronDown className="size-5" />
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {open === i ? (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <p className="max-w-2xl pb-5 text-[15px] leading-relaxed text-ink-2">{f.a}</p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

export function Landing(props: Props) {
  const { signedIn, appHref, loyaltyEvery } = props;
  const cta = signedIn ? appHref : "/login";

  return (
    <div className="overflow-x-clip">
      <header className="safe-top mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <Logo />
        <LinkButton href={cta} variant="secondary" size="sm">
          {signedIn ? "Open app" : "Sign in"}
        </LinkButton>
      </header>

      {/* HERO */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-4 sm:px-8 lg:grid-cols-[1fr_0.95fr] lg:gap-16 lg:pt-12">
        <div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="text-[14px] font-semibold text-primary">
            {ESTATE_NAME}, Abuja
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.05 }}
            className="mt-3 font-display text-[42px] font-bold leading-[1.02] tracking-[-0.035em] text-ink sm:text-[60px] lg:text-[68px]"
          >
            Errands in the estate, done for you.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.15 }}
            className="mt-5 max-w-[32rem] text-[17px] leading-relaxed text-ink-2 sm:text-[19px]"
          >
            Order from the shops you already know, or tell us what you need. A vetted runner from the estate brings it to your door.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.25 }}
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
          <p className="mt-6 flex items-center gap-2 text-[13.5px] text-muted">
            <BadgeCheck className="size-4 text-primary" /> Runners are vetted with NIN and a guarantor.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease, delay: 0.1 }}
          className="relative mx-auto aspect-[4/5] w-full max-w-[460px] overflow-hidden rounded-[28px] bg-sunken shadow-[var(--shadow-raised)]"
        >
          <Photo src={PHOTOS.heroRider} alt="A runner cycling through the estate with a delivery box" sizes="(min-width: 1024px) 460px, 100vw" preload />
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6, ease }}
            className="absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-2xl bg-surface/95 p-3 shadow-[var(--shadow-raised)] backdrop-blur"
          >
            <Avatar name="Adaeze Okafor" size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14.5px] font-semibold text-ink">Adaeze is on the way</p>
              <p className="truncate text-[12.5px] text-muted">From Village Mart · Block C, House 14</p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <Reveal>
          <h2 className="max-w-xl font-display text-[32px] font-bold leading-[1.08] tracking-[-0.02em] text-ink sm:text-[42px]">
            The little errands that eat your day.
          </h2>
        </Reveal>
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-7 lg:grid-cols-3">
          {CATEGORIES.map((c, i) => (
            <Reveal key={c.id} delay={i * 0.04}>
              <div className="group">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[20px] bg-sunken">
                  <Photo src={categoryPhoto(c.id)} alt="" sizes="(min-width: 1024px) 360px, 50vw" className="transition-transform duration-700 group-hover:scale-[1.04]" />
                </div>
                <h3 className="mt-3 font-display text-[18px] font-semibold text-ink sm:text-[20px]">{c.label}</h3>
                <p className="mt-0.5 text-[13.5px] leading-snug text-muted sm:text-[15px]">{c.blurb}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-10 px-5 py-14 sm:px-8">
        <Reveal>
          <h2 className="max-w-xl font-display text-[32px] font-bold leading-[1.08] tracking-[-0.02em] text-ink sm:text-[42px]">How it works</h2>
        </Reveal>
        <div className="mt-8 grid gap-8 lg:grid-cols-3 lg:gap-6">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.06}>
              <div className="relative aspect-[3/2] overflow-hidden rounded-[20px] bg-sunken">
                <Photo src={s.photo} alt="" sizes="(min-width: 1024px) 360px, 100vw" />
              </div>
              <p className="mt-4 text-[13px] font-semibold text-muted">Step {i + 1}</p>
              <h3 className="mt-0.5 font-display text-[21px] font-semibold text-ink">{s.title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{s.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* PROMISE */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <Reveal>
          <div className="rounded-[28px] bg-hero px-6 py-12 text-hero-ink sm:px-12 sm:py-14">
            <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
              <div>
                <h2 className="font-display text-[32px] font-bold leading-[1.08] tracking-[-0.02em] sm:text-[42px]">Pay only in the app.</h2>
                <p className="mt-4 max-w-md text-[16px] leading-relaxed text-hero-muted">
                  Runners never ask for cash. Every errand paid through {APP_NAME} is tracked from the shop to your door.
                </p>
              </div>
              <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
                {[
                  { icon: ShieldCheck, t: "Covered errands", d: "If something goes wrong, we sort it out." },
                  { icon: Wallet, t: "Change to your wallet", d: "When a runner buys for you, the rest comes back." },
                  { icon: BadgeCheck, t: "Vetted runners", d: "NIN-checked, with a guarantor." },
                  { icon: Package, t: "Delivery code", d: "Nothing is complete until you say so." },
                ].map(({ icon: Icon, t, d }) => (
                  <li key={t}>
                    <Icon className="size-6 text-accent" strokeWidth={1.8} />
                    <p className="mt-2.5 text-[16px] font-semibold">{t}</p>
                    <p className="mt-0.5 text-[14px] text-hero-muted">{d}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </section>

      {loyaltyEvery > 0 ? (
        <section className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
          <Reveal>
            <p className="font-display text-[24px] font-semibold leading-snug text-ink sm:text-[30px]">
              Every {ordinal(loyaltyEvery)} errand fee is on us. <span className="text-muted">No codes, it just happens.</span>
            </p>
          </Reveal>
        </section>
      ) : null}

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 py-14 sm:px-8">
        <Reveal>
          <h2 className="mb-6 font-display text-[32px] font-bold tracking-[-0.02em] text-ink sm:text-[42px]">Questions</h2>
          <Faq {...props} />
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-10 pt-4 sm:px-8">
        <Reveal>
          <div className="flex flex-col items-start gap-6 rounded-[28px] bg-primary px-6 py-12 text-primary-ink sm:flex-row sm:items-center sm:justify-between sm:px-12">
            <div>
              <h2 className="font-display text-[30px] font-bold leading-tight sm:text-[40px]">Ready when you are.</h2>
              <p className="mt-1 text-[16px] opacity-80">Sign in with your phone number. It takes about 20 seconds.</p>
            </div>
            <Link
              href={cta}
              className="inline-flex h-14 shrink-0 items-center gap-2 rounded-[18px] bg-white px-7 text-[17px] font-semibold text-[#0b3526] transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              Start an errand <ArrowRight className="size-5" />
            </Link>
          </div>
        </Reveal>
        <footer className="mt-10 flex flex-col items-center justify-between gap-3 pb-6 text-[13px] text-muted sm:flex-row">
          <Logo size={26} className="scale-90" />
          <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link href="/terms" className="hover:text-ink">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <span>
              © {new Date().getFullYear()} {APP_NAME} · {ESTATE_NAME}, Abuja
            </span>
          </p>
        </footer>
      </section>
    </div>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
