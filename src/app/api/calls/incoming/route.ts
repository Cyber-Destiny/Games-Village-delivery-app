import { json, withUser } from "@/lib/api";
import { incomingCall } from "@/lib/calls";

export const GET = withUser(async (_req, user) => json({ call: await incomingCall(user) }));
