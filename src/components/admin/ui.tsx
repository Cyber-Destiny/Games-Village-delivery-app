import { cn } from "@/lib/cn";

export function AdminHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-[30px] font-bold leading-tight text-ink sm:text-[34px]">{title}</h1>
        {description ? <p className="mt-1 text-[15px] text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({ title, action, children, className, bodyClass }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={cn("card overflow-hidden", className)}>
      {title ? (
        <div className="flex items-center justify-between gap-3 border-b border-line/70 px-5 py-4">
          <h2 className="font-display text-[17px] font-semibold text-ink">{title}</h2>
          {action}
        </div>
      ) : null}
      <div className={cn(bodyClass)}>{children}</div>
    </section>
  );
}

export function EmptyRow({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-10 text-center text-[14px] text-muted">{children}</div>;
}
