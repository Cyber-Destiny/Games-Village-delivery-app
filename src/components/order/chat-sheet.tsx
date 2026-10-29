"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, MessagesSquare } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Sheet } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import type { ChatMessage } from "@/lib/orders/queries";
import { formatTime } from "@/lib/time";

export function ChatSheet({
  orderId,
  open,
  onClose,
  title,
  quickReplies = [],
  disabled,
}: {
  orderId: string;
  open: boolean;
  onClose: () => void;
  title: string;
  quickReplies?: string[];
  disabled?: boolean;
}) {
  const { data, mutate, isLoading } = useSWR<{ messages: ChatMessage[] }>(open ? `/api/orders/${orderId}/messages` : null, {
    refreshInterval: open ? 3000 : 0,
  });
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const messages = data?.messages ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, open]);

  async function send(body: string) {
    const msg = body.trim();
    if (!msg || sending) return;
    setSending(true);
    haptic(6);
    const optimistic: ChatMessage = {
      id: `tmp-${Date.now()}`,
      body: msg,
      mine: true,
      sender: "You",
      senderRole: "resident",
      createdAt: new Date().toISOString(),
      read: false,
    };
    setText("");
    try {
      await mutate(
        async () => {
          const res = await fetch(`/api/orders/${orderId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body: msg }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || "Couldn't send");
          return json;
        },
        { optimisticData: { messages: [...messages, optimistic] }, rollbackOnError: true, revalidate: false },
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send");
      setText(msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={title} className="h-[78dvh] sm:h-[640px]">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="-mx-6 min-h-0 flex-1 space-y-2 overflow-y-auto px-6 pb-4">
          {isLoading && !data ? (
            <div className="grid h-40 place-items-center">
              <Spinner className="text-muted" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft">
                <MessagesSquare className="size-7 text-primary-soft-ink" />
              </span>
              <p className="mt-3 font-display text-[17px] font-semibold text-ink">No messages yet</p>
              <p className="mt-1 max-w-[260px] text-[13.5px] text-muted">Phone numbers stay private. Chat here about anything on this errand.</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((m, i) => {
                const prev = messages[i - 1];
                const showName = !m.mine && (!prev || prev.sender !== m.sender || prev.mine);
                return (
                  <motion.div
                    key={m.id}
                    layout
                    initial={{ opacity: 0, y: 12, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 34 }}
                    className={cn("flex flex-col", m.mine ? "items-end" : "items-start")}
                  >
                    {showName ? <span className="mb-1 ml-3 text-[11.5px] font-semibold text-muted">{m.sender}</span> : null}
                    <div
                      className={cn(
                        "max-w-[82%] rounded-[20px] px-4 py-2.5 text-[15px] leading-snug",
                        m.mine ? "rounded-br-md bg-primary text-primary-ink" : m.senderRole === "admin" || m.senderRole === "support" ? "rounded-bl-md bg-accent-soft text-accent-soft-ink" : "rounded-bl-md bg-sunken text-ink",
                      )}
                    >
                      {m.body}
                    </div>
                    <span className="mx-2 mt-1 text-[10.5px] text-faint">{formatTime(m.createdAt)}</span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
          <div ref={endRef} />
        </div>

        {!disabled && quickReplies.length ? (
          <div className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6 pb-3">
            {quickReplies.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="h-8 shrink-0 rounded-full border border-line bg-surface px-3 text-[12.5px] font-medium text-ink-2 hover:bg-surface-2"
              >
                {q}
              </button>
            ))}
          </div>
        ) : null}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
          className="flex items-end gap-2"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={disabled}
            placeholder={disabled ? "This chat is closed" : "Message…"}
            className="h-12 flex-1 rounded-full border border-line bg-surface-2 px-5 text-[16px] outline-none focus:border-primary"
          />
          <motion.button
            whileTap={{ scale: 0.88 }}
            type="submit"
            disabled={!text.trim() || sending || disabled}
            aria-label="Send"
            className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-ink shadow-[var(--shadow-button)] disabled:opacity-40"
          >
            <ArrowUp className="size-5" strokeWidth={2.6} />
          </motion.button>
        </form>
      </div>
    </Sheet>
  );
}
