import { Logo } from "@/components/brand/logo";
import { Photo } from "@/components/brand/photo";
import { APP_NAME, ESTATE_NAME } from "@/lib/brand";
import { PHOTOS } from "@/lib/photos";

/** Split layout for sign-in screens: photo panel + form. */
export function AuthShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  return (
    <main className="min-h-dvh lg:grid lg:grid-cols-[1.05fr_1fr]">
      <section className="relative flex min-h-[300px] flex-col overflow-hidden bg-hero px-6 pb-14 pt-[max(env(safe-area-inset-top),20px)] text-white lg:min-h-dvh lg:px-14 lg:pb-14">
        <Photo src={PHOTOS.heroRider} alt="" sizes="(min-width: 1024px) 55vw, 100vw" preload className="object-[center_35%]" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/25" />
        <div className="relative z-10 pt-2">
          <Logo tone="light" />
        </div>
        <div className="relative z-10 mt-auto pt-16">
          <p className="text-[14px] font-medium text-white/80">{ESTATE_NAME}, Abuja</p>
          <h2 className="mt-2 max-w-md font-display text-[30px] font-bold leading-[1.05] tracking-[-0.02em] lg:text-[46px]">{title}</h2>
          <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-white/80 lg:text-[17px]">{subtitle}</p>
          <p className="mt-10 hidden text-[13px] text-white/60 lg:block">© {new Date().getFullYear()} {APP_NAME}</p>
        </div>
      </section>
      <section className="relative z-10 -mt-6 rounded-t-[28px] bg-bg px-6 pb-10 pt-8 lg:mt-0 lg:flex lg:items-center lg:justify-center lg:rounded-none lg:px-14">
        <div className="mx-auto w-full max-w-[420px]">{children}</div>
      </section>
    </main>
  );
}
