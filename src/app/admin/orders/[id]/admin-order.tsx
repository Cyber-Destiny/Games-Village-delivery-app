"use client";

import { AlertTriangle, ArrowLeft, Ban, Check, CircleCheck, Landmark, MessageCircle, Phone, Repeat2, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import useSWR from "swr";
import { Panel } from "@/components/admin/ui";
import { CategoryArt, tintFor } from "@/components/brand/category-art";
import { ChatSheet } from "@/components/order/chat-sheet";
import { ItemsList, Milestones, MoneyBreakdown, Photo, Timeline } from "@/components/order/parts";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { getCategory } from "@/lib/categories";
import { naira } from "@/lib/money";
import type { OrderView } from "@/lib/orders/queries";
import { formatPhoneLocal } from "@/lib/phone";
import { formatDateTime } from "@/lib/time";
import { approve, cancelOrder, markDelivered, markManual, reassignOrder, retry } from "../../actions";

type FreeRunner = { id: string; name: string; online: boolean };

export function AdminOrder({ initial, runners }: { initial: OrderView; runners: FreeRunner[] }) {
  const router = useRouter();
  const { data, mutate } = useSWR<{ order: OrderView }>(`/api/orders/${initial.id}`, { fallbackData: { order: initial }, refreshInterval: 5000 });
  const o = data?.order ?? initial;
  const [pending, start] = useTransition();
  const [chat, setChat] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const tint = tintFor(o.category);
  const final = o.status === "delivered" || o.status === "cancelled";
  const vendorPaid = o.vendorPayout && ["success", "manual"].includes(o.vendorPayout.status) ? o.vendorPayout.amount : 0;
  const paidIn = (o.at.paid ? o.money.total : o.money.walletApplied) + o.money.topupTotal;

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return toast.error((res as { error: string }).error);
      toast.success(msg);
      mutate();
      router.refresh();
    });

  return (
    <>
      <Link href="/admin/orders" className="mb-4 inline-flex items-center gap-1.5 text-[14px] font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> All errands
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid size-16 place-items-center rounded-[20px]" style={{ background: tint.bg }}>
            <CategoryArt id={o.category} size={46} />
          </span>
          <div>
            <h1 className="font-display text-[30px] font-bold leading-tight text-ink">#{o.code}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[13.5px] text-muted">
              <StatusBadge status={o.status} />
              <span>{getCategory(o.category).label}</span>
              <span>· {formatDateTime(o.at.created)}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setChat(true)}>
            <MessageCircle className="size-4" /> Chat {o.unread ? <Badge tone="accent">{o.unread}</Badge> : null}
          </Button>
          {["searching", "assigned", "to_vendor"].includes(o.status) ? (
            <Button variant="secondary" onClick={() => setAssignOpen(true)}>
              <Repeat2 className="size-4" /> Reassign
            </Button>
          ) : null}
          {["at_vendor", "on_the_way", "arrived"].includes(o.status) ? (
            <Button variant="soft" loading={pending} onClick={() => act(() => markDelivered(o.id), "Marked delivered")}>
              <CircleCheck className="size-4" /> Mark delivered
            </Button>
          ) : null}
          {!final ? (
            <Button variant="danger" onClick={() => setCancelOpen(true)}>
              <Ban className="size-4" /> Cancel
            </Button>
          ) : null}
        </div>
      </div>

      {o.status !== "cancelled" && o.status !== "awaiting_payment" ? (
        <div className="card mb-6 px-4 py-5 sm:px-8">
          <Milestones status={o.status} kind={o.kind} />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Panel title="What they asked for" bodyClass="p-5">
            <p className="mb-4 text-[14px] text-ink-2">
              {o.kind === "pickup" ? `Pick up from ${o.pickupFrom ?? "—"}` : `From ${o.vendorName ?? "any shop"}`}
              {o.vendorIsPartner ? <Badge tone="brand" className="ml-2">Partner</Badge> : null}
            </p>
            <ItemsList order={o} />
            <div className="mt-4 border-t border-line pt-4 text-[14px] text-ink-2">
              <span className="font-semibold text-ink">Deliver to:</span> {o.deliverTo ?? `Block ${o.drop.block}, House ${o.drop.house}`}
              {o.drop.street ? ` · ${o.drop.street}` : ""}
              {o.drop.landmark ? ` · ${o.drop.landmark}` : ""}
            </div>
          </Panel>

          <Panel title="Activity" bodyClass="p-5">
            <Timeline events={o.events} defaultOpen />
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="People" bodyClass="divide-y divide-line/70">
            <Person label="Resident" name={o.resident.name ?? o.resident.firstName} phone={o.resident.phone} />
            {o.runner ? (
              <Person
                label="Runner"
                name={o.runner.name}
                phone={o.runner.phone}
                extra={
                  <span className="inline-flex items-center gap-1 text-[12.5px] text-muted">
                    <Star className="size-3 fill-accent text-accent" /> {o.runner.rating?.toFixed(1) ?? "New"}
                    {o.runner.tag ? ` · ${o.runner.tag}` : ""}
                  </span>
                }
              />
            ) : (
              <div className="px-5 py-4 text-[14px] text-muted">No runner yet</div>
            )}
          </Panel>

          <Panel title="Money" bodyClass="p-5">
            <MoneyBreakdown order={o} perspective="admin" />
            {o.deliveryCode && !final ? (
              <div className="mt-4 flex items-center justify-between rounded-xl bg-surface-2 px-3.5 py-3">
                <span className="text-[13.5px] text-muted">Delivery code</span>
                <span className="tnum font-display text-[18px] font-bold tracking-[0.3em] text-ink">{o.deliveryCode}</span>
              </div>
            ) : null}
            {o.receiptUrl ? (
              <div className="mt-4">
                <Photo url={o.receiptUrl} label="Receipt" />
              </div>
            ) : null}
          </Panel>

          {o.vendorPayout ? (
            <Panel title="Shop payment" bodyClass="p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-sunken">
                  <Landmark className="size-5 text-ink-2" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="tnum text-[17px] font-semibold text-ink">{naira(o.vendorPayout.amount)}</p>
                  <p className="truncate text-[13px] text-muted">
                    {o.vendorPayout.accountName} · {o.vendorPayout.bankName}
                  </p>
                  {o.vendorPayout.failureReason ? (
                    <p className="mt-1 flex items-center gap-1 text-[12.5px] text-danger">
                      <AlertTriangle className="size-3.5" /> {o.vendorPayout.failureReason}
                    </p>
                  ) : null}
                </div>
                <Badge tone={["success", "manual"].includes(o.vendorPayout.status) ? "success" : ["failed", "reversed", "rejected"].includes(o.vendorPayout.status) ? "danger" : "accent"}>
                  {o.vendorPayout.status.replace("_", " ")}
                </Badge>
              </div>
              {!final && ["pending_approval", "failed", "reversed"].includes(o.vendorPayout.status) ? (
                <div className="mt-4 flex gap-2">
                  {o.vendorPayout.status === "pending_approval" ? (
                    <Button size="sm" loading={pending} onClick={() => act(() => approve(o.vendorPayout!.id), "Transfer sent")}>
                      <Check className="size-4" /> Approve transfer
                    </Button>
                  ) : null}
                  {o.vendorPayout.status !== "pending_approval" ? (
                    <Button size="sm" loading={pending} onClick={() => act(() => retry(o.vendorPayout!.id), "Retrying transfer")}>
                      Retry transfer
                    </Button>
                  ) : null}
                  <Button size="sm" variant="secondary" disabled={pending} onClick={() => act(() => markManual(o.vendorPayout!.id), "Marked as paid")}>
                    Paid another way
                  </Button>
                </div>
              ) : null}
            </Panel>
          ) : null}

          {o.rating ? (
            <Panel title="Rating" bodyClass="p-5">
              <p className="text-[20px] text-accent">{"★".repeat(o.rating.rating)}<span className="text-line-strong">{"★".repeat(5 - o.rating.rating)}</span></p>
              {o.rating.tags.length ? <p className="mt-2 text-[13.5px] text-ink-2">{o.rating.tags.join(" · ")}</p> : null}
              {o.rating.comment ? <p className="mt-2 text-[14px] italic text-ink-2">“{o.rating.comment}”</p> : null}
            </Panel>
          ) : null}
        </div>
      </div>

      <CancelDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        defaultRefund={Math.max(0, paidIn - vendorPaid)}
        vendorPaid={vendorPaid}
        pending={pending}
        onConfirm={(reason, refund) =>
          act(async () => {
            const res = await cancelOrder(o.id, reason, refund);
            if (res.ok) setCancelOpen(false);
            return res;
          }, "Errand cancelled")
        }
      />

      <Sheet open={assignOpen} onClose={() => setAssignOpen(false)} title="Reassign errand" description="Pick a free runner, or release it so the next free runner gets it.">
        <div className="space-y-2 pt-2">
          {runners.length === 0 ? <p className="py-4 text-center text-[14px] text-muted">No free runners right now.</p> : null}
          {runners.map((r) => (
            <button
              key={r.id}
              disabled={pending || r.id === o.runner?.id}
              onClick={() =>
                act(async () => {
                  const res = await reassignOrder(o.id, r.id);
                  if (res.ok) setAssignOpen(false);
                  return res;
                }, `Assigned to ${r.name.split(" ")[0]}`)
              }
              className="flex w-full items-center gap-3 rounded-2xl border border-line px-4 py-3 text-left hover:bg-surface-2 disabled:opacity-50"
            >
              <Avatar name={r.name} size={38} />
              <span className="flex-1 font-medium text-ink">{r.name}</span>
              <Badge tone={r.online ? "success" : "neutral"} dot>
                {r.online ? "Online" : "Offline"}
              </Badge>
            </button>
          ))}
          <Button
            variant="secondary"
            block
            className="mt-2"
            disabled={pending}
            onClick={() =>
              act(async () => {
                const res = await reassignOrder(o.id, null);
                if (res.ok) setAssignOpen(false);
                return res;
              }, "Released to the queue")
            }
          >
            Release to next free runner
          </Button>
        </div>
      </Sheet>

      <ChatSheet orderId={o.id} open={chat} onClose={() => setChat(false)} title="Errand chat (you're Support)" quickReplies={["Hi, this is Runam support 👋", "We're on it", "Sorted — thanks for your patience"]} />
    </>
  );
}

function Person({ label, name, phone, extra }: { label: string; name: string | null; phone: string | null; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <Avatar name={name} size={42} />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium uppercase tracking-wider text-muted">{label}</p>
        <p className="truncate font-semibold text-ink">{name ?? "—"}</p>
        {extra}
      </div>
      {phone ? (
        <a href={`tel:+${phone}`} className="flex h-9 items-center gap-1.5 rounded-xl bg-sunken px-3 text-[13px] font-semibold text-ink hover:bg-line">
          <Phone className="size-3.5" /> {formatPhoneLocal(phone)}
        </a>
      ) : null}
    </div>
  );
}

function CancelDialog({
  open,
  onClose,
  defaultRefund,
  vendorPaid,
  pending,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  defaultRefund: number;
  vendorPaid: number;
  pending: boolean;
  onConfirm: (reason: string, refund: number) => void;
}) {
  const [reason, setReason] = useState("Shop closed / out of stock");
  const [refund, setRefund] = useState(defaultRefund);
  useEffect(() => {
    if (open) setRefund(defaultRefund);
  }, [open, defaultRefund]);
  return (
    <Sheet open={open} onClose={onClose} title="Cancel and refund" description="The refund goes to the resident's wallet instantly.">
      <div className="space-y-4 pt-2">
        <Field label="Reason">
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>
            {["Shop closed / out of stock", "No runner available", "Resident asked to cancel", "Duplicate errand", "Other"].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </Field>
        <Field label="Refund to wallet" hint={vendorPaid ? `The shop was already paid ${naira(vendorPaid)} — that's excluded by default.` : "Full amount paid by default."}>
          <MoneyInput value={refund} onChange={setRefund} />
        </Field>
        <Button variant="danger" size="lg" block loading={pending} onClick={() => onConfirm(reason, refund)}>
          Cancel errand · refund {naira(refund)}
        </Button>
      </div>
    </Sheet>
  );
}
