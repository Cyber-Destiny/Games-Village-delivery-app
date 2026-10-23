import "server-only";
import { and, desc, eq, gt, inArray, or, sql } from "drizzle-orm";
import { db } from "./db";
import { calls, orderEvents, orders, shopThreads, users, vendors, type Call, type User } from "./db/schema";
import { UserError } from "./errors";
import { notify } from "./notify";
import { RUNNER_ACTIVE_STATUSES } from "./orders/status";
import { addMessage, ensureThread, shortName, staffIds } from "./shop-chat";

// In-app voice calls. The browser sets up a WebRTC connection; this module only
// stores the offer/answer and who may join. Nothing is recorded.

const RING_MS = 45_000;
const MAX_SDP = 40_000;

const firstName = (n: string | null | undefined) => (n ?? "").trim().split(/\s+/)[0] || "";

export type CallTarget = { vendorId: string } | { threadId: string } | { orderId: string };
type Side = "resident" | "vendor" | "runner";

export type CallView = {
  id: string;
  status: Call["status"];
  role: "caller" | "callee";
  peer: { name: string; subtitle: string; image: string | null; category: string | null };
  offer: string | null;
  answer: string | null;
  createdAt: string;
  answeredAt: string | null;
};

/** Who is on each end of a call, and how each side sees the other. */
async function context(call: Pick<Call, "threadId" | "orderId" | "callerSide">) {
  if (call.threadId) {
    const [row] = await db
      .select({ t: shopThreads, shop: vendors, resident: users })
      .from(shopThreads)
      .innerJoin(vendors, eq(vendors.id, shopThreads.vendorId))
      .innerJoin(users, eq(users.id, shopThreads.residentId))
      .where(eq(shopThreads.id, call.threadId));
    if (!row) throw new UserError("Call not found.");
    const staff = await staffIds(row.shop.id);
    return {
      residentId: row.t.residentId,
      others: staff,
      isParticipant: (u: User) => u.id === row.t.residentId || (!!u.vendorId && u.vendorId === row.shop.id),
      sideOf: (u: User): Side => (u.id === row.t.residentId ? "resident" : "vendor"),
      peerFor: (side: Side) =>
        side === "resident"
          ? { name: row.shop.name, subtitle: "Shop", image: row.shop.image, category: row.shop.category }
          : { name: shortName(row.resident.name), subtitle: "Customer", image: null, category: null },
      urlFor: (side: Side) => (side === "resident" ? `/chat/${row.shop.id}` : `/shop/chats/${row.t.id}`),
    };
  }
  const [row] = await db
    .select({ o: orders, resident: users })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.residentId))
    .where(eq(orders.id, call.orderId!));
  if (!row) throw new UserError("Call not found.");
  const [runner] = row.o.runnerId ? await db.select().from(users).where(eq(users.id, row.o.runnerId)) : [];
  return {
    residentId: row.o.residentId,
    others: runner ? [runner.id] : [],
    isParticipant: (u: User) => u.id === row.o.residentId || (!!runner && u.id === runner.id),
    sideOf: (u: User): Side => (u.id === row.o.residentId ? "resident" : "runner"),
    peerFor: (side: Side) =>
      side === "resident"
        ? { name: firstName(runner?.name) || "Your runner", subtitle: `Your runner · #${row.o.code}`, image: null, category: null }
        : { name: firstName(row.resident.name) || "Customer", subtitle: `Block ${row.o.dropBlock}, House ${row.o.dropHouse}`, image: null, category: null },
    urlFor: (side: Side) => (side === "resident" ? `/orders/${row.o.id}` : `/runner/jobs/${row.o.id}`),
    orderActive: RUNNER_ACTIVE_STATUSES.includes(row.o.status),
  };
}

function view(call: Call, user: User, ctx: Awaited<ReturnType<typeof context>>): CallView {
  const role = call.callerId === user.id ? "caller" : "callee";
  return {
    id: call.id,
    status: call.status,
    role,
    peer: ctx.peerFor(ctx.sideOf(user)),
    offer: role === "callee" ? call.offer : null,
    answer: role === "caller" ? call.answer : null,
    createdAt: call.createdAt.toISOString(),
    answeredAt: call.answeredAt?.toISOString() ?? null,
  };
}

function checkSdp(sdp: string) {
  if (!sdp || sdp.length > MAX_SDP || !sdp.startsWith("v=0")) throw new UserError("Couldn't start the call.");
  return sdp;
}

export async function startCall(user: User, target: CallTarget, offer: string): Promise<CallView> {
  checkSdp(offer);
  let threadId: string | null = null;
  let orderId: string | null = null;
  let side: Side;

  if ("vendorId" in target) {
    if (user.role !== "resident") throw new UserError("Only residents can call shops.");
    const [shop] = await db.select().from(vendors).where(and(eq(vendors.id, target.vendorId), eq(vendors.isActive, true)));
    if (!shop) throw new UserError("That shop isn't available.");
    if (!(await staffIds(shop.id)).length) throw new UserError(`${shop.name} isn't taking calls yet.`);
    threadId = (await ensureThread(shop.id, user.id)).id;
    side = "resident";
  } else if ("threadId" in target) {
    const [t] = await db.select().from(shopThreads).where(eq(shopThreads.id, target.threadId));
    if (!t || !user.vendorId || t.vendorId !== user.vendorId) throw new UserError("Chat not found.");
    threadId = t.id;
    side = "vendor";
  } else {
    const [o] = await db.select().from(orders).where(eq(orders.id, target.orderId));
    if (!o || (o.residentId !== user.id && o.runnerId !== user.id)) throw new UserError("Errand not found.");
    if (!o.runnerId || !RUNNER_ACTIVE_STATUSES.includes(o.status)) throw new UserError("Calls are available while a runner is on your errand.");
    orderId = o.id;
    side = o.residentId === user.id ? "resident" : "runner";
  }

  // Only one call at a time per caller: drop any earlier attempt still ringing.
  await db
    .update(calls)
    .set({ status: "cancelled", endedAt: new Date() })
    .where(and(eq(calls.callerId, user.id), eq(calls.status, "ringing")));

  const [call] = await db.insert(calls).values({ threadId, orderId, callerId: user.id, callerSide: side, offer }).returning();
  const ctx = await context(call);
  const callees = side === "resident" ? ctx.others : [ctx.residentId];
  if (!callees.length) throw new UserError("There's nobody to call right now.");
  const callerName = side === "vendor" ? ctx.peerFor("resident").name : firstName(user.name) || "Someone";
  await notify(callees, {
    title: "Incoming call",
    body: `${callerName} is calling you on the app`,
    url: ctx.urlFor(side === "resident" ? (call.threadId ? "vendor" : "runner") : "resident"),
    tag: `call-${call.id}`,
  });
  return view(call, user, ctx);
}

async function load(user: User, callId: string) {
  const [call] = await db.select().from(calls).where(eq(calls.id, callId));
  if (!call) throw new UserError("Call not found.");
  const ctx = await context(call);
  if (!ctx.isParticipant(user)) throw new UserError("Call not found.");
  // Ringing too long means nobody picked up.
  if (call.status === "ringing" && Date.now() - call.createdAt.getTime() > RING_MS) {
    const [missed] = await db
      .update(calls)
      .set({ status: "missed", endedAt: new Date() })
      .where(and(eq(calls.id, call.id), eq(calls.status, "ringing")))
      .returning();
    if (missed) {
      await logCall(missed);
      return { call: missed, ctx };
    }
  }
  return { call, ctx };
}

export async function getCall(user: User, callId: string): Promise<CallView> {
  const { call, ctx } = await load(user, callId);
  return view(call, user, ctx);
}

export async function answerCall(user: User, callId: string, answer: string): Promise<CallView> {
  checkSdp(answer);
  const { call, ctx } = await load(user, callId);
  if (call.callerId === user.id) throw new UserError("You can't answer your own call.");
  const [updated] = await db
    .update(calls)
    .set({ status: "active", answer, answeredBy: user.id, answeredAt: new Date() })
    .where(and(eq(calls.id, call.id), eq(calls.status, "ringing")))
    .returning();
  if (!updated) throw new UserError(call.status === "active" ? "Someone else answered this call." : "This call has ended.");
  return view(updated, user, ctx);
}

export async function declineCall(user: User, callId: string): Promise<CallView> {
  const { call, ctx } = await load(user, callId);
  const [updated] = await db
    .update(calls)
    .set({ status: "declined", endedAt: new Date() })
    .where(and(eq(calls.id, call.id), eq(calls.status, "ringing")))
    .returning();
  if (updated) await logCall(updated);
  return view(updated ?? call, user, ctx);
}

export async function endCall(user: User, callId: string): Promise<CallView> {
  const { call, ctx } = await load(user, callId);
  if (call.status !== "ringing" && call.status !== "active") return view(call, user, ctx);
  const next = call.status === "active" ? "ended" : call.callerId === user.id ? "cancelled" : "declined";
  const [updated] = await db
    .update(calls)
    .set({ status: next, endedAt: new Date() })
    .where(and(eq(calls.id, call.id), inArray(calls.status, ["ringing", "active"])))
    .returning();
  if (updated) await logCall(updated);
  return view(updated ?? call, user, ctx);
}

/** The newest call ringing for this user, if any. */
export async function incomingCall(user: User): Promise<CallView | null> {
  const since = new Date(Date.now() - RING_MS);
  const conds = [];
  if (user.role === "resident") {
    conds.push(
      and(eq(calls.callerSide, "vendor"), sql`${calls.threadId} in (select id from shop_threads where resident_id = ${user.id})`),
      and(eq(calls.callerSide, "runner"), sql`${calls.orderId} in (select id from orders where resident_id = ${user.id})`),
    );
  }
  if (user.vendorId) {
    conds.push(and(eq(calls.callerSide, "resident"), sql`${calls.threadId} in (select id from shop_threads where vendor_id = ${user.vendorId})`));
  }
  if (user.role === "runner") {
    conds.push(and(eq(calls.callerSide, "resident"), sql`${calls.orderId} in (select id from orders where runner_id = ${user.id})`));
  }
  if (!conds.length) return null;
  const [call] = await db
    .select()
    .from(calls)
    .where(and(eq(calls.status, "ringing"), gt(calls.createdAt, since), or(...conds)))
    .orderBy(desc(calls.createdAt))
    .limit(1);
  if (!call || call.callerId === user.id) return null;
  return view(call, user, await context(call));
}

function duration(call: Call) {
  if (!call.answeredAt || !call.endedAt) return "";
  const s = Math.max(1, Math.round((call.endedAt.getTime() - call.answeredAt.getTime()) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Leaves a line in the chat (shop calls) or the errand timeline (runner calls). */
async function logCall(call: Call) {
  const [caller] = await db.select({ name: users.name }).from(users).where(eq(users.id, call.callerId));
  const who = call.callerSide === "vendor" ? "the shop" : firstName(caller?.name) || "someone";
  const line =
    call.status === "ended"
      ? `Voice call · ${duration(call)}`
      : call.status === "missed"
        ? `Missed call from ${who}`
        : call.status === "declined"
          ? `Call from ${who} declined`
          : null;
  if (!line) return;
  try {
    if (call.threadId) await addMessage(call.threadId, "system", line, null);
    else if (call.orderId) await db.insert(orderEvents).values({ orderId: call.orderId, type: "call", message: line, actorId: call.callerId });
  } catch (err) {
    console.error("[calls] log failed", err);
  }
}

/** STUN/TURN servers for the browser. Add TURN details for reliable calls on mobile data. */
export function iceServers() {
  const servers: Array<{ urls: string[]; username?: string; credential?: string }> = [
    { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] },
  ];
  const turn = (process.env.TURN_URLS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (turn.length && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
    servers.push({ urls: turn, username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL });
  }
  return servers;
}
