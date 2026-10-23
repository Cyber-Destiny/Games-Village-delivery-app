import { json, withUser } from "@/lib/api";
import { answerCall, declineCall, endCall, getCall } from "@/lib/calls";
import { UserError } from "@/lib/errors";

type Ctx = { params: Promise<{ id: string }> };

async function callId(params: Ctx["params"]) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new UserError("Call not found.");
  return id;
}

export const GET = withUser<Ctx>(async (_req, user, { params }) => json({ call: await getCall(user, await callId(params)) }));

export const POST = withUser<Ctx>(async (req, user, { params }) => {
  const id = await callId(params);
  const body = (await req.json().catch(() => ({}))) as { action?: string; answer?: string };
  if (body.action === "answer") return json({ call: await answerCall(user, id, String(body.answer ?? "")) });
  if (body.action === "decline") return json({ call: await declineCall(user, id) });
  if (body.action === "end") return json({ call: await endCall(user, id) });
  throw new UserError("Unknown call action.");
});
