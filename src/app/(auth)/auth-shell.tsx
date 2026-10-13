import { EstateMap } from "@/components/brand/estate-map";
import { Logo } from "@/components/brand/logo";
import { APP_NAME, ESTATE_NAME } from "@/lib/brand";

/** Split layout for sign-in screens: brand panel + form. */
export function AuthShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  return (
    <main className="min-h-dvh lg:grid lg:grid-cols-[1.05fr_1fr]">
      <section className="grain relative flex flex-col overflow-hidden bg-hero px-6 pb-16 pt-[max(env(safe-area-inset-top),20px)] text-hero-ink lg:min-h-dvh lg:px-14 lg:pb-14">
        <div
          aria-hidden
          className="absolute -right-32 top-10 size-[460px] rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, color-mix(in oklab, var(--accent) 40%, transparent), transparent 65%)" }}
        />
        <div className="relative z-10 pt-2">
          <Logo tone="light" />
        </div>
        <div className="relative z-10 mt-10 lg:mt-auto">
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.16em] text-accent">{ESTATE_NAME}, Abuja</p>
          <h2 className="mt-3 max-w-md font-display text-[30px] font-bold leading-[1.05] lg:text-[48px]">{title}</h2>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-hero-muted lg:text-[17px]">{subtitle}</p>
        </div>
        <div className="relative z-10 mt-10 hidden lg:block">
          <div className="rounded-[28px] bg-white/[0.06] p-2 ring-1 ring-white/10">
            <EstateMap demo progress={0} height={240} className="rounded-[22px]" />
          </div>
          <p className="mt-4 text-[13px] text-hero-muted">© {new Date().getFullYear()} {APP_NAME}</p>
        </div>
      </section>
      <section className="relative z-10 -mt-8 rounded-t-[32px] bg-bg px-6 pb-10 pt-8 lg:mt-0 lg:flex lg:items-center lg:justify-center lg:rounded-none lg:px-14">
        <div className="mx-auto w-full max-w-[420px]">{children}</div>
      </section>
    </main>
  );
}
