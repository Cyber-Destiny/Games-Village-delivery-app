import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { LEGAL_UPDATED } from "@/lib/legal";

export type LegalSection = { id: string; title: string; body: React.ReactNode };

/** Long-form legal document: contents list, numbered sections, readable measure. */
export function LegalPage({ title, intro, sections, other }: { title: string; intro: React.ReactNode; sections: LegalSection[]; other: { href: string; label: string } }) {
  return (
    <main className="min-h-dvh bg-bg">
      <header className="safe-top border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <Link href="/" aria-label="Home" className="-ml-2 flex items-center gap-1 rounded-full py-2 pl-1 pr-3 text-[14px] font-medium text-ink-2 hover:bg-sunken">
            <ChevronLeft className="size-5" />
            <Logo size={26} />
          </Link>
          <Link href={other.href} className="text-[14px] font-semibold text-primary">
            {other.label}
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 pb-24 pt-10">
        <h1 className="font-display text-[34px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[42px]">{title}</h1>
        <p className="mt-2 text-[14px] text-muted">Last updated {LEGAL_UPDATED}</p>
        <div className="mt-6 space-y-4 text-[16px] leading-relaxed text-ink-2">{intro}</div>

        <nav aria-label="Contents" className="mt-8 rounded-[18px] border border-line bg-surface p-5">
          <p className="text-[13px] font-semibold text-muted">Contents</p>
          <ol className="mt-3 grid gap-x-6 gap-y-1.5 text-[14.5px] sm:grid-cols-2">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-ink-2 hover:text-primary">
                  <span className="tnum mr-2 text-faint">{i + 1}.</span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-6">
              <h2 className="font-display text-[21px] font-semibold text-ink">
                <span className="tnum mr-2 text-faint">{i + 1}.</span>
                {s.title}
              </h2>
              <div className="legal-body mt-3 space-y-3 text-[15.5px] leading-relaxed text-ink-2">{s.body}</div>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
