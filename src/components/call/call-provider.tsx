"use client";

import { AnimatePresence, motion } from "motion/react";
import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Photo, categoryPhoto } from "@/components/brand/photo";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toast";
import { APP_NAME } from "@/lib/brand";
import type { CallTarget, CallView } from "@/lib/calls";

type Phase = "idle" | "outgoing" | "incoming" | "connecting" | "active" | "ended";
type Peer = CallView["peer"];

const CallContext = createContext<{ start: (target: CallTarget, peer: Peer) => void; busy: boolean } | null>(null);

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used inside <CallProvider>");
  return ctx;
}

const ENDED = ["ended", "declined", "missed", "cancelled"];

/** Vibrates where allowed (browsers block it until the user has tapped the page). */
function buzz(pattern: number | number[]) {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  navigator.vibrate(pattern);
}

/** Waits for ICE candidates so the offer/answer can be exchanged in one go. */
function gathered(pc: RTCPeerConnection, ms = 2500) {
  return new Promise<void>((resolve) => {
    if (pc.iceGatheringState === "complete") return resolve();
    const t = setTimeout(resolve, ms);
    pc.addEventListener("icegatheringstatechange", () => {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(t);
        resolve();
      }
    });
  });
}

async function post(url: string, body?: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Something went wrong");
  return json as { call: CallView };
}

function endNote(c: CallView, wasCaller: boolean) {
  if (c.status === "declined") return wasCaller ? "Call declined" : "Call ended";
  if (c.status === "missed") return wasCaller ? "No answer" : "Missed call";
  if (c.status === "cancelled") return wasCaller ? "Call cancelled" : "Missed call";
  return "Call ended";
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [peer, setPeer] = useState<Peer | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [offer, setOffer] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [muted, setMuted] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const phaseRef = useRef<Phase>("idle");
  const callIdRef = useRef<string | null>(null);
  const roleRef = useRef<"caller" | "callee">("caller");
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const go = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const teardown = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    if (audioRef.current) audioRef.current.srcObject = null;
    buzz(0);
  }, []);

  const finish = useCallback(
    (message: string) => {
      teardown();
      go("ended");
      setNote(message);
      setTimeout(() => {
        if (phaseRef.current !== "ended") return;
        go("idle");
        setCallId(null);
        callIdRef.current = null;
        setPeer(null);
        setOffer(null);
        setMuted(false);
        setStartedAt(null);
      }, 1800);
    },
    [teardown],
  );

  const hangUp = useCallback(
    (message = "Call ended") => {
      const id = callIdRef.current;
      if (id) post(`/api/calls/${id}`, { action: "end" }).catch(() => {});
      finish(message);
    },
    [finish],
  );

  async function setup(): Promise<RTCPeerConnection> {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("Calls aren't supported in this browser.");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch {
      throw new Error("Allow microphone access to make calls.");
    }
    streamRef.current = stream;
    const { iceServers } = await fetch("/api/calls/ice").then((r) => r.json());
    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    pc.ontrack = (e) => {
      if (audioRef.current) {
        audioRef.current.srcObject = e.streams[0];
        audioRef.current.play().catch(() => {});
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc !== pcRef.current) return;
      if (pc.connectionState === "connected") {
        go("active");
        setStartedAt((s) => s ?? Date.now());
      } else if (pc.connectionState === "failed") {
        hangUp("Call dropped. Check your connection.");
      }
    };
    return pc;
  }

  const start = useCallback(
    async (target: CallTarget, who: Peer) => {
      if (phaseRef.current !== "idle") return;
      roleRef.current = "caller";
      setPeer(who);
      setNote("Calling…");
      go("outgoing");
      try {
        const pc = await setup();
        await pc.setLocalDescription(await pc.createOffer());
        await gathered(pc);
        if ((phaseRef.current as Phase) !== "outgoing") return teardown();
        const { call } = await post("/api/calls", { ...target, offer: pc.localDescription?.sdp });
        callIdRef.current = call.id;
        setCallId(call.id);
        setNote("Ringing…");
      } catch (err) {
        teardown();
        go("idle");
        setPeer(null);
        toast.error(err instanceof Error ? err.message : "Couldn't start the call");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [teardown],
  );

  async function accept() {
    const id = callIdRef.current;
    if (!id || !offer) return;
    go("connecting");
    buzz(0);
    try {
      const pc = await setup();
      await pc.setRemoteDescription({ type: "offer", sdp: offer });
      await pc.setLocalDescription(await pc.createAnswer());
      await gathered(pc);
      await post(`/api/calls/${id}`, { action: "answer", answer: pc.localDescription?.sdp });
    } catch (err) {
      finish(err instanceof Error ? err.message : "Couldn't join the call");
    }
  }

  function decline() {
    const id = callIdRef.current;
    if (id) post(`/api/calls/${id}`, { action: "decline" }).catch(() => {});
    finish("Call declined");
  }

  function toggleMute() {
    const next = !muted;
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  }

  // Listen for incoming calls while the app is open.
  useEffect(() => {
    let stopped = false;
    async function check() {
      if (document.hidden || phaseRef.current !== "idle") return;
      const r = await fetch("/api/calls/incoming").then((res) => (res.ok ? res.json() : null)).catch(() => null);
      const c: CallView | null = r?.call ?? null;
      if (stopped || !c || phaseRef.current !== "idle") return;
      roleRef.current = "callee";
      callIdRef.current = c.id;
      setCallId(c.id);
      setOffer(c.offer);
      setPeer(c.peer);
      setNote(`${c.peer.subtitle} · calling you`);
      go("incoming");
    }
    check();
    const t = setInterval(check, 5000);
    const onVisible = () => !document.hidden && check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Follow the call on the server: the answer arriving, or the other side hanging up.
  useEffect(() => {
    if (!callId || phase === "idle" || phase === "ended") return;
    const t = setInterval(
      async () => {
        const r = await fetch(`/api/calls/${callId}`).then((res) => (res.ok ? res.json() : null)).catch(() => null);
        const c: CallView | undefined = r?.call;
        if (!c || callIdRef.current !== c.id) return;
        if (ENDED.includes(c.status)) return finish(endNote(c, roleRef.current === "caller"));
        const pc = pcRef.current;
        if (roleRef.current === "caller" && c.status === "active" && c.answer && pc && !pc.remoteDescription) {
          go("connecting");
          await pc.setRemoteDescription({ type: "answer", sdp: c.answer }).catch(() => hangUp("Couldn't connect the call"));
        }
      },
      phase === "outgoing" || phase === "connecting" ? 1000 : 2500,
    );
    return () => clearInterval(t);
  }, [callId, phase, finish, hangUp]);

  // Vibrate while ringing.
  useEffect(() => {
    if (phase !== "incoming") return;
    buzz([500, 300, 500]);
    const t = setInterval(() => buzz([500, 300, 500]), 2500);
    return () => {
      clearInterval(t);
      buzz(0);
    };
  }, [phase]);

  // Call timer.
  useEffect(() => {
    if (phase !== "active") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const elapsed = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  const status =
    phase === "active" ? `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}` : phase === "connecting" ? "Connecting…" : note;

  return (
    <CallContext.Provider value={{ start, busy: phase !== "idle" }}>
      {children}
      <audio ref={audioRef} autoPlay playsInline className="hidden" />
      <AnimatePresence>
        {phase !== "idle" && peer ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[95] flex flex-col items-center bg-[#0b2a1e] px-6 text-white"
            role="dialog"
            aria-label={`Call with ${peer.name}`}
          >
            <div className="safe-pt-16 flex w-full max-w-sm flex-1 flex-col items-center justify-center pb-10 text-center">
              <div className="relative grid place-items-center">
                {phase === "outgoing" || phase === "incoming" ? (
                  <>
                    <motion.span
                      aria-hidden
                      className="absolute size-36 rounded-full bg-white/10"
                      animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                    />
                    <motion.span
                      aria-hidden
                      className="absolute size-36 rounded-full bg-white/10"
                      animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut", delay: 0.8 }}
                    />
                  </>
                ) : null}
                {peer.image || peer.category ? (
                  <span className="relative block size-32 overflow-hidden rounded-full ring-4 ring-white/15">
                    <Photo src={peer.image || categoryPhoto(peer.category!)} sizes="256px" />
                  </span>
                ) : (
                  <span className="relative rounded-full ring-4 ring-white/15">
                    <Avatar name={peer.name} size={128} />
                  </span>
                )}
              </div>
              <p className="mt-8 font-display text-[28px] font-bold leading-tight">{peer.name}</p>
              <p className="tnum mt-2 text-[15px] text-white/75">{status}</p>
            </div>

            <div className="safe-pb-10 w-full max-w-sm">
              {phase === "incoming" ? (
                <div className="flex items-center justify-around">
                  <RoundButton label="Decline" onClick={decline} className="bg-[#e5484d]">
                    <PhoneOff className="size-7" />
                  </RoundButton>
                  <RoundButton label="Accept" onClick={accept} className="bg-[#2fbf71]">
                    <Phone className="size-7" />
                  </RoundButton>
                </div>
              ) : phase === "ended" ? (
                <div className="h-[104px]" />
              ) : (
                <div className="flex items-center justify-around">
                  <RoundButton label={muted ? "Unmute" : "Mute"} onClick={toggleMute} className={muted ? "bg-white text-[#0b2a1e]" : "bg-white/15"}>
                    {muted ? <MicOff className="size-7" /> : <Mic className="size-7" />}
                  </RoundButton>
                  <RoundButton label="End" onClick={() => hangUp()} className="bg-[#e5484d]">
                    <PhoneOff className="size-7" />
                  </RoundButton>
                </div>
              )}
              <p className="mt-8 text-center text-[12px] text-white/50">Free {APP_NAME} call over the internet. Calls aren&apos;t recorded.</p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </CallContext.Provider>
  );
}

function RoundButton({ label, onClick, className, children }: { label: string; onClick: () => void; className: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <motion.button whileTap={{ scale: 0.9 }} onClick={onClick} aria-label={label} className={`grid size-[72px] place-items-center rounded-full ${className}`}>
        {children}
      </motion.button>
      <span className="text-[13px] text-white/80">{label}</span>
    </div>
  );
}

/** Phone button that starts an in-app call. */
export function CallButton({
  target,
  peer,
  className,
  children,
}: {
  target: CallTarget;
  peer: Peer;
  className?: string;
  children?: React.ReactNode;
}) {
  const { start, busy } = useCall();
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      type="button"
      disabled={busy}
      onClick={() => start(target, peer)}
      aria-label={`Call ${peer.name}`}
      className={className ?? "grid size-10 place-items-center rounded-full bg-primary-soft text-primary-soft-ink disabled:opacity-50"}
    >
      {children ?? <Phone className="size-[18px]" />}
    </motion.button>
  );
}
