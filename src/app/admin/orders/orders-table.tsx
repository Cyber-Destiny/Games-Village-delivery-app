"use client";

import { motion } from "motion/react";
import { Search, Star } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { AdminHeader, EmptyRow, Panel } from "@/components/admin/ui";
import { CategoryBadge } from "@/components/brand/category-art";
import { StatusBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import type { AdminOrderRow, OrderFilter } from "@/lib/admin";
import { naira } from "@/lib/money";
import { formatDate, formatTime } from "@/lib/time";

export function OrdersTable({ rows, filter, q }: { rows: AdminOrderRow[]; filter: OrderFilter; q: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(q);
  const [pending, start] = useTransition();

  const go = (next: { filter?: OrderFilter; q?: string }) => {
    const params = new URLSearchParams();
    params.set("filter", next.filter ?? filter);
    const qq = next.q ?? query;
    if (qq) params.set("q", qq);
    start(() => router.replace(`${pathname}?${params}`));
  };

  useEffect(() => {
    if (query === q) return;
    const t = setTimeout(() => go({ q: query }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // keep the list fresh while watching active errands
  useEffect(() => {
    if (filter !== "active" && filter !== "attention") return;
    const t = setInterval(() => router.refresh(), 10000);
    return () => clearInterval(t);
  }, [filter, router]);

  return (
    <>
      <AdminHeader title="Errands" description="Every errand in the estate, live." />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Segmented
            value={filter}
            onChange={(f) => go({ filter: f })}
            options={[
              { value: "active", label: "Active" },
              { value: "attention", label: "Needs attention" },
              { value: "delivered", label: "Delivered" },
              { value: "cancelled", label: "Cancelled" },
              { value: "all", label: "All" },
            ]}
          />
        </div>
        <div className="w-full lg:w-80">
          <Input
            leading={pending ? <Spinner className="size-4" /> : <Search className="size-4" />}
            placeholder="Code, name, phone, shop, block…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11"
          />
        </div>
      </div>

      <Panel>
        {rows.length === 0 ? (
          <EmptyRow>No errands match.</EmptyRow>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-[14px]">
              <thead>
                <tr className="border-b border-line/70 text-[12px] font-semibold uppercase tracking-wider text-muted">
                  <th className="px-5 py-3">Errand</th>
                  <th className="px-3 py-3">Resident</th>
                  <th className="px-3 py-3">Runner</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Total</th>
                  <th className="px-5 py-3 text-right">Placed</th>
                </tr>
              </thead>
              <motion.tbody initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.015 } } }}>
                {rows.map((r) => (
                  <motion.tr
                    key={r.id}
                    variants={{ h: { opacity: 0 }, s: { opacity: 1 } }}
                    onClick={() => router.push(`/admin/orders/${r.id}`)}
                    className="cursor-pointer border-b border-line/50 transition-colors last:border-0 hover:bg-surface-2"
                  >
                    <td className="px-5 py-3">
                      <Link href={`/admin/orders/${r.id}`} className="flex items-center gap-3">
                        <CategoryBadge id={r.category} size={38} />
                        <span className="min-w-0">
                          <span className="block max-w-[260px] truncate font-semibold text-ink">{r.title}</span>
                          <span className="block text-[12.5px] text-muted">
                            #{r.code}
                            {r.place ? ` · ${r.place}` : ""}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <span className="block font-medium text-ink">{r.resident}</span>
                      <span className="block text-[12.5px] text-muted">
                        Block {r.block}, {r.house}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-ink-2">{r.runner ?? <span className="text-faint">—</span>}</td>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-2">
                        <StatusBadge status={r.status} />
                        {r.rating ? (
                          <span className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-ink-2">
                            <Star className="size-3 fill-accent text-accent" />
                            {r.rating}
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="tnum px-3 py-3 text-right font-medium text-ink">{naira(r.total)}</td>
                    <td className="tnum px-5 py-3 text-right text-[13px] text-muted">
                      {formatDate(r.createdAt)}, {formatTime(r.createdAt)}
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
