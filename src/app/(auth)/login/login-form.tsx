"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/ui/otp-input";
import { toast } from "@/components/ui/toast";
import { APP_NAME } from "@/lib/brand";
import { telLink, whatsappLink } from "@/lib/contact";
import { haptic } from "@/lib/haptics";
import { formatPhoneLocal, maskPhone } from "@/lib/phone";
import { requestCode, verifyCode } from "../actions";

const ease = [0.22, 1, 0.36, 1] as const;

function formatLocal(digits: string) {
  const d = digits.slice(0, 11);
  if (d.length <= 4) return d;
  if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`;
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
}

export function LoginForm({ supportPhone }: { supportPhone: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code" | "done">("phone");
  const [raw, setRaw] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const digits = raw.replace(/\D/g, "");
  const local = digits.startsWith("234") ? "0" + digits.slice(3) : digits.startsWith("0") ? digits : digits ? "0" + digits : "";
  const phoneReady = local.length === 11;

  function send() {
    setError(null);
    start(async () => {
      const res = await requestCode(local);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPhone(res.data.phone);
      setDevCode(res.data.devCode);
      setCountdown(res.data.retryIn);
      setCode("");
      setStep("code");
    });
  }

  function verify(v: string) {
    setError(null);
    setInvalid(false);
    start(async () => {
      const res = await verifyCode(phone, v);
      if (!res.ok) {
        setError(res.error);
        setInvalid(true);
        haptic([20, 40, 20]);
        setTimeout(() => setCode(""), 350);
        return;
      }
      haptic([10, 30, 10]);
      setStep("done");
      setTimeout(() => router.replace(res.data.redirect), 650);
    });
  }

  function resend() {
    start(async () => {
      const res = await requestCode(phone);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setDevCode(res.data.devCode);
      setCountdown(res.data.retryIn);
      toast.success("New code sent");
    });
  }

  return (
    <div className="relative min-h-[360px]">
      <AnimatePresence mode="wait" initial={false}>
        {step === "phone" ? (
          <motion.form
            key="phone"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.35, ease }}
            onSubmit={(e) => {
              e.preventDefault();
              if (phoneReady) send();
            }}
          >
            <h1 className="font-display text-[32px] font-bold leading-tight text-ink">What&apos;s your number?</h1>
            <p className="mt-2 text-[15.5px] text-muted">We&apos;ll text you a 6-digit code to sign in. No passwords.</p>

            <label className="mt-8 flex h-16 items-center gap-3 rounded-2xl border border-line bg-surface px-4 transition-[border-color,box-shadow] focus-within:border-primary focus-within:shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_14%,transparent)]">
              <span className="flex items-center gap-2 border-r border-line pr-3 text-[16px] font-medium text-ink-2">
                <span aria-hidden className="text-[18px]">🇳🇬</span> +234
              </span>
              <input
                autoFocus
                inputMode="tel"
                autoComplete="tel-national"
                aria-label="Phone number"
                placeholder="0803 123 4567"
                value={formatLocal(local)}
                onChange={(e) => {
                  setRaw(e.target.value);
                  setError(null);
                }}
                className="tnum h-full w-full bg-transparent font-display text-[22px] font-semibold tracking-wide text-ink outline-none placeholder:font-normal placeholder:text-faint"
              />
            </label>
            <AnimatePresence>
              {error ? (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 text-[13px] font-medium text-danger">
                  {error}
                </motion.p>
              ) : null}
            </AnimatePresence>

            <Button type="submit" size="xl" block className="mt-6" disabled={!phoneReady} loading={pending}>
              Send code <ArrowRight className="size-5" />
            </Button>
            <p className="mt-5 text-center text-[12.5px] leading-relaxed text-faint">
              By continuing you agree to our{" "}
              <Link href="/terms" className="underline underline-offset-2">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline underline-offset-2">
                Privacy Policy
              </Link>
              . Only arrange and pay for errands in the app. We aren&apos;t responsible for anything arranged outside it.
            </p>
          </motion.form>
        ) : step === "code" ? (
          <motion.div
            key="code"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.35, ease }}
          >
            <button
              onClick={() => {
                setStep("phone");
                setError(null);
              }}
              className="-ml-1 mb-4 inline-flex items-center gap-1.5 rounded-full px-1 py-1 text-[14px] font-medium text-muted hover:text-ink"
            >
              <ArrowLeft className="size-4" /> Change number
            </button>
            <h1 className="font-display text-[32px] font-bold leading-tight text-ink">Enter the code</h1>
            <p className="mt-2 text-[15.5px] text-muted">
              Sent to <span className="font-medium text-ink-2">{maskPhone(phone)}</span>
            </p>

            {devCode ? (
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                onClick={() => {
                  setCode(devCode);
                  verify(devCode);
                }}
                className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-dashed border-accent bg-accent-soft px-4 py-3 text-left"
              >
                <KeyRound className="size-5 shrink-0 text-accent-soft-ink" />
                <span className="text-[13.5px] leading-snug text-accent-soft-ink">
                  Demo mode — your code is <span className="font-display text-[15px] font-bold tracking-widest">{devCode}</span>. Tap to fill.
                </span>
              </motion.button>
            ) : null}

            <div className="mt-6">
              <OtpInput
                value={code}
                onChange={(v) => {
                  setCode(v);
                  setInvalid(false);
                  setError(null);
                }}
                onComplete={verify}
                invalid={invalid}
                disabled={pending}
              />
            </div>
            <div className="mt-3 h-5">
              <AnimatePresence>
                {error ? (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[13px] font-medium text-danger">
                    {error}
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </div>

            <Button size="xl" block className="mt-4" disabled={code.length !== 6} loading={pending} onClick={() => verify(code)}>
              Verify
            </Button>
            <div className="mt-5 text-center text-[14px] text-muted">
              {countdown > 0 ? (
                <span>
                  Resend code in <span className="tnum font-medium text-ink-2">0:{String(countdown).padStart(2, "0")}</span>
                </span>
              ) : (
                <button onClick={resend} className="font-semibold text-primary hover:underline" disabled={pending}>
                  Resend code
                </button>
              )}
            </div>
            {supportPhone ? (
              <p className="mt-3 text-center text-[13px] text-faint">
                No code?{" "}
                <a href={whatsappLink(supportPhone, `Hi ${APP_NAME}, I can't sign in. My number is `)} target="_blank" rel="noopener noreferrer" className="font-medium text-ink-2 underline underline-offset-2">
                  WhatsApp us
                </a>{" "}
                or call <a href={telLink(supportPhone)} className="tnum font-medium text-ink-2">{formatPhoneLocal(supportPhone)}</a>
              </p>
            ) : null}
          </motion.div>
        ) : (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid min-h-[360px] place-items-center">
            <div className="flex flex-col items-center gap-4">
              <motion.div
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
                className="grid size-20 place-items-center rounded-full bg-primary text-primary-ink shadow-[var(--shadow-button)]"
              >
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15, type: "spring", stiffness: 500, damping: 15 }}>
                  <Check className="size-10" strokeWidth={3} />
                </motion.span>
              </motion.div>
              <p className="font-display text-[20px] font-semibold text-ink">You&apos;re in</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
