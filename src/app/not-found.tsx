import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="flex flex-col items-center">
        <LogoMark size={56} />
        <p className="mt-8 font-display text-[64px] font-bold leading-none text-line-strong">404</p>
        <h1 className="mt-3 font-display text-[26px] font-bold text-ink">This errand took a wrong turn</h1>
        <p className="mt-2 max-w-sm text-[15px] text-muted">The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
        <Link href="/" className="mt-8 inline-flex h-12 items-center rounded-2xl bg-primary px-6 font-semibold text-primary-ink shadow-[var(--shadow-button)]">
          Back home
        </Link>
      </div>
    </main>
  );
}
