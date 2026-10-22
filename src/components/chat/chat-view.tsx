"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowUp } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { haptic } from "@/lib/haptics";
import type { ShopChatMessage } from "@/lib/shop-chat";
import { formatDate, formatTime, lagosDateKey } from "@/lib/time";

type ChatData = { messages: ShopChatMessage[]; seenAt: string | null };

function dayLabel(iso: string) {
  const key = lagosDateKey(new Date(iso));
  const today = lagosDateKey(new Date());
  const yesterday = lagosDateKey(new Date(Date.now() - 86_400_000));
  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";
  return formatDate(iso);
}

/**
 * Full-screen chat: messages scroll with the page, the composer sticks to the bottom.
 * Polls for new messages every few seconds while open.
 */
export function ChatView<T extends ChatData>({
  endpoint,
  initial,
  header,
  intro,
  quickReplies = [],
  closed,
  placeholder = "Message",
  side,
}: {
  side: "resident" | "vendor";
  endpoint: string;
  initial: T;
  header: (data: T) => React.ReactNode;
  intro?: (data: T) => React.ReactNode;
  quickReplies?: string[];
  closed?: (data: T) => React.ReactNode | null;
  placeholder?: string;
}) {
  const { data = initial, mutate } = useSWR<T>(endpoint, { fallbackData: initial, refreshInterval: 2500, revalidateOnMount: false });
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const messages = data.messages;
  const closedNote = closed?.(data) ?? null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: messages.length > 1 ? "smooth" : "auto", block: "end" });
  }, [messages.length]);

  const lastMine = [...messages].reverse().find((m) => m.mine);
  const seen = !!(lastMine && data.seenAt && data.seenAt >= lastMine.createdAt);

  async function send(body: string) {
    const msg = body.trim();
    if (!msg || sending) return;
    setSending(true);
    haptic(6);
    setText("");
    const optimistic: ShopChatMessage = {
      id: `tmp-${Date.now()}`,
      body: msg,
      side,
      mine: true,
      sender: "You",
      createdAt: new Date().toISOString(),
      orderId: null,
    };
    try {
      await mutate(
        async () => {
          const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: msg }) });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || "Couldn't send");
          return json as T;
        },
        { optimisticData: { ...data, messages: [...messages, optimistic] }, rollbackOnError: true, revalidate: false },
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send");
      setText(msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="safe-top sticky top-0 z-30 border-b border-line/70 bg-bg/90 backdrop-blur-xl">{header(data)}</header>

      <div className="flex-1 px-4 pb-44 pt-4">
        {intro ? intro(data) : null}
        <AnimatePresence initial={false}>
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const newDay = !prev || lagosDateKey(new Date(prev.createdAt)) !== lagosDateKey(new Date(m.createdAt));
            const grouped = !!prev && !newDay && prev.side === m.side && new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 3 * 60_000;
            return (
              <Fragment key={m.id}>
                {newDay ? (
                  <p className="py-3 text-center text-[12px] font-medium text-muted">{dayLabel(m.createdAt)}</p>
                ) : null}
                {m.side === "system" ? (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="my-3 flex justify-center">
                    <p className="max-w-[88%] rounded-2xl border border-line bg-surface px-4 py-2.5 text-center text-[13px] leading-snug text-ink-2">
                      {m.body}
                      <span className="mt-0.5 block text-[11px] text-faint">{formatTime(m.createdAt)}</span>
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 520, damping: 36 }}
                    className={cn("flex flex-col", m.mine ? "items-end" : "items-start", grouped ? "mt-1" : "mt-3")}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] whitespace-pre-wrap break-words rounded-[20px] px-4 py-2.5 text-[15px] leading-snug",
                        m.mine ? "bg-primary text-primary-ink" : "bg-surface text-ink ring-1 ring-line",
                        m.mine ? (grouped ? "rounded-tr-md" : "rounded-br-md") : grouped ? "rounded-tl-md" : "rounded-bl-md",
                      )}
                    >
                      {m.body}
                    </div>
                    {!messages[i + 1] || messages[i + 1].side !== m.side ? (
                      <span className="mx-2 mt-1 text-[11px] text-faint">
                        {formatTime(m.createdAt)}
                        {m.mine && m.id === lastMine?.id && seen ? " · Seen" : ""}
                      </span>
                    ) : null}
                  </motion.div>
                )}
              </Fragment>
            );
          })}
        </AnimatePresence>
        <div ref={endRef} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] border-t border-line/70 bg-bg/95 backdrop-blur-xl">
        <div className="safe-bottom px-4 pt-3">
          {closedNote ? (
            <div className="pb-1 text-center text-[13.5px] text-muted">{closedNote}</div>
          ) : (
            <>
              {quickReplies.length ? (
                <div className="no-scrollbar -mx-4 mb-2.5 flex gap-2 overflow-x-auto px-4">
                  {quickReplies.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="h-8 shrink-0 rounded-full border border-line bg-surface px-3.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:bg-surface-2"
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
                <textarea
                  value={text}
                  rows={1}
                  onChange={(e) => {
                    setText(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !("ontouchstart" in window)) {
                      e.preventDefault();
                      send(text);
                    }
                  }}
                  placeholder={placeholder}
                  aria-label="Message"
                  className="max-h-[120px] min-h-12 flex-1 resize-none rounded-3xl border border-line bg-surface px-5 py-3 text-[16px] leading-snug outline-none focus:border-primary"
                />
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  type="submit"
                  disabled={!text.trim() || sending}
                  aria-label="Send"
                  className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-ink disabled:opacity-40"
                >
                  <ArrowUp className="size-5" strokeWidth={2.6} />
                </motion.button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
