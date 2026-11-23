"use client";

import { Download, EllipsisVertical, Share, Smartphone, SquarePlus } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { APP_NAME } from "@/lib/brand";

// Offers to install Runam (Android / desktop Chrome) or shows how to add it to the
// home screen (iPhone, other browsers) when someone opens the site in a browser.

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

// Chrome fires this once, often before React has rendered, so catch it as soon as this file loads.
let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // we show our own prompt instead of the browser's banner
    deferred = e as InstallEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const OPEN_EVENT = "runam:install";
const SNOOZE_KEY = "runam-install-snoozed";
const SNOOZE_MS = 3 * 24 * 3600 * 1000;
const SKIP = [/^\/pay\//, /^\/terms/, /^\/privacy/];

type Platform = "ios" | "android" | "desktop";

function platform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function installed() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function snoozed() {
  try {
    return Date.now() - Number(localStorage.getItem(SNOOZE_KEY) ?? 0) < SNOOZE_MS;
  } catch {
    return false;
  }
}

function snooze() {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
  } catch {
    // private mode: it just shows again next time
  }
}

/** Opens the install prompt from anywhere (e.g. an "Add to home screen" row). */
export function openInstallPrompt() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function InstallPrompt() {
  const pathname = usePathname();
  const canPrompt = useSyncExternalStore(subscribe, () => !!deferred, () => false);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Platform>("desktop");

  useEffect(() => {
    if (installed()) return;
    setKind(platform());
    const show = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, show);
    // Shortly after the site opens, unless they said "Not now" in the last few days.
    const t = setTimeout(() => {
      if (snoozed() || SKIP.some((r) => r.test(window.location.pathname))) return;
      // On a computer, only offer it where the browser can actually install it.
      if (platform() === "desktop" && !deferred) return;
      setOpen(true);
    }, 1200);
    return () => {
      clearTimeout(t);
      window.removeEventListener(OPEN_EVENT, show);
    };
  }, []);

  useEffect(() => {
    if (SKIP.some((r) => r.test(pathname))) setOpen(false);
  }, [pathname]);

  const close = () => {
    snooze();
    setOpen(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    if (outcome === "dismissed") snooze();
    setOpen(false);
  };

  return (
    <Sheet open={open} onClose={close}>
      <div className="pb-1 pt-4 text-center">
        <LogoMark size={64} className="mx-auto" />
        <h2 className="mt-4 font-display text-[22px] font-bold text-ink">Get the {APP_NAME} app</h2>
        <p className="mx-auto mt-1.5 max-w-xs text-[14.5px] leading-relaxed text-muted">
          Add {APP_NAME} to your home screen. It opens in one tap, full screen, and can alert you about your errands.
        </p>
      </div>

      {canPrompt ? (
        <div className="mt-6 space-y-2">
          <Button size="lg" className="w-full" onClick={install}>
            <Download className="size-5" /> Install app
          </Button>
          <Button size="lg" variant="ghost" className="w-full" onClick={close}>
            Not now
          </Button>
        </div>
      ) : (
        <>
          <ol className="mt-6 space-y-3 rounded-2xl bg-surface-2 p-4 text-[14.5px] text-ink-2">
            {kind === "ios" ? (
              <>
                <Step n={1} icon={<Share className="size-4" />}>
                  Tap the <b className="text-ink">Share</b> button: at the bottom in Safari, or at the top in Chrome.
                </Step>
                <Step n={2} icon={<SquarePlus className="size-4" />}>
                  Scroll down and tap <b className="text-ink">Add to Home Screen</b>.
                </Step>
                <Step n={3} icon={<Smartphone className="size-4" />}>
                  Tap <b className="text-ink">Add</b>, then open {APP_NAME} from your home screen.
                </Step>
              </>
            ) : (
              <>
                <Step n={1} icon={<EllipsisVertical className="size-4" />}>
                  Tap the browser menu <b className="text-ink">⋮</b> at the top right.
                </Step>
                <Step n={2} icon={<SquarePlus className="size-4" />}>
                  Tap <b className="text-ink">Install app</b> or <b className="text-ink">Add to Home screen</b>.
                </Step>
                <Step n={3} icon={<Smartphone className="size-4" />}>
                  Open {APP_NAME} from your home screen.
                </Step>
              </>
            )}
          </ol>
          {kind === "ios" ? (
            <p className="mt-3 text-center text-[12.5px] leading-relaxed text-muted">
              Opened this from WhatsApp or Instagram? Open runam.app in Safari first. You&apos;ll sign in once more inside the app.
            </p>
          ) : null}
          <Button size="lg" className="mt-5 w-full" onClick={close}>
            Got it
          </Button>
        </>
      )}
    </Sheet>
  );
}

function Step({ n, icon, children }: { n: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-left">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface text-primary shadow-[var(--shadow-card)]" aria-hidden>
        {icon}
      </span>
      <span className="pt-1">
        <span className="sr-only">Step {n}: </span>
        {children}
      </span>
    </li>
  );
}

/** A row for account/profile pages; hidden once the app is installed. */
export function InstallRow() {
  const [show, setShow] = useState(false);
  useEffect(() => setShow(!installed()), []);
  if (!show) return null;
  return (
    <button onClick={openInstallPrompt} className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left">
      <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary-soft-ink">
        <Smartphone className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-ink">Add to home screen</span>
        <span className="block text-[12.5px] text-muted">Open {APP_NAME} in one tap, like an app</span>
      </span>
    </button>
  );
}
