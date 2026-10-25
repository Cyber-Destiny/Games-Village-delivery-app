export function MobileSkeleton() {
  return (
    <div className="safe-pt-6 space-y-4 px-5" aria-busy>
      <div className="skeleton h-4 w-28" />
      <div className="skeleton h-9 w-44" />
      <div className="skeleton mt-6 h-40 w-full rounded-[26px]" />
      <div className="skeleton h-20 w-full rounded-[22px]" />
      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton aspect-square rounded-[22px]" />
        ))}
      </div>
    </div>
  );
}

export function AdminSkeleton() {
  return (
    <div className="space-y-6" aria-busy>
      <div className="skeleton h-10 w-56" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-32 rounded-[22px]" />
        ))}
      </div>
      <div className="skeleton h-80 rounded-[22px]" />
    </div>
  );
}
